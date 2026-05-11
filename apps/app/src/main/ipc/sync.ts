import {
	CLOUD_SYNC_SCHEMA_VERSION,
	Channels,
	type ICloudSyncResult,
	type ISyncPullData,
	type ISyncValidateData,
	type SyncTableName,
} from "@repo/types";
import { ipcMain } from "electron";
import { getDb } from "../db.js";

interface JsonResponse<T> {
	success: boolean;
	error?: string;
	data?: T;
	allowedTables?: SyncTableName[];
	batchLimit?: number;
	syncSessionId?: string;
}

function getDesktopSyncContract() {
	const db = getDb();
	return {
		clientId: "desktop",
		schemaVersion: CLOUD_SYNC_SCHEMA_VERSION,
		tables: db.getSyncTables(),
		batchLimit: db.getSyncBatchLimit(),
	};
}

async function requestJson<T>(
	url: string,
	params: {
		method?: "GET" | "POST";
		accessToken: string;
		body?: Record<string, unknown>;
	},
): Promise<JsonResponse<T>> {
	const response = await fetch(url, {
		method: params.method ?? "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${params.accessToken}`,
		},
		body: params.body ? JSON.stringify(params.body) : undefined,
	});

	const json = (await response
		.json()
		.catch(() => null)) as JsonResponse<T> | null;
	if (!json) {
		throw new Error(`Empty response from ${url}`);
	}
	if (!json.success) {
		throw new Error(json.error || `Request to ${url} failed`);
	}
	return json;
}

ipcMain.handle(
	Channels.DB_CLOUD_SYNC_VALIDATE,
	async (
		_event,
		{
			accessToken,
			apiBaseUrl,
		}: {
			accessToken: string;
			apiBaseUrl: string;
		},
	): Promise<ISyncValidateData> => {
		if (!accessToken) {
			throw new Error("Missing Supabase access token");
		}
		if (!apiBaseUrl) {
			throw new Error("Missing API base URL");
		}

		const baseUrl = apiBaseUrl.replace(/\/$/, "");
		const localContract = getDesktopSyncContract();
		const validation = await requestJson<ISyncValidateData>(
			`${baseUrl}/api/sync/validate`,
			{
				accessToken,
				body: localContract,
			},
		);

		if (!validation.data) {
			throw new Error("Sync validation returned no data");
		}

		return validation.data;
	},
);

ipcMain.handle(
	Channels.DB_CLOUD_SYNC,
	async (
		_event,
		{
			accessToken,
			apiBaseUrl,
		}: {
			accessToken: string;
			apiBaseUrl: string;
		},
	): Promise<ICloudSyncResult> => {
		if (!accessToken) {
			throw new Error("Missing Supabase access token");
		}
		if (!apiBaseUrl) {
			throw new Error("Missing API base URL");
		}

		const baseUrl = apiBaseUrl.replace(/\/$/, "");
		const db = getDb();
		const localContract = getDesktopSyncContract();
		const validation = await requestJson<ISyncValidateData>(
			`${baseUrl}/api/sync/validate`,
			{
				accessToken,
				body: localContract,
			},
		);
		const validationData = validation.data;
		if (!validationData) {
			throw new Error("Sync validation returned no data");
		}
		if (!validationData.userId) {
			throw new Error("Sync validation did not return an internal user id");
		}
		if (!validationData.compatible) {
			throw new Error(
				validationData.reasons.join(". ") ||
					"Desktop and server sync conditions do not match",
			);
		}

		const start = await requestJson<never>(`${baseUrl}/api/sync/start`, {
			accessToken,
			body: {
				clientId: localContract.clientId,
				schemaVersion: localContract.schemaVersion,
			},
		});

		const syncSessionId = start.syncSessionId;
		const allowedTables = start.allowedTables ?? [];
		const batchLimit = start.batchLimit ?? db.getSyncBatchLimit();
		const userId = validationData.userId;
		const existingSyncState = await db.getSyncState({ userId });
		const syncMode: ICloudSyncResult["syncMode"] =
			existingSyncState &&
			existingSyncState.lastSchemaVersion === localContract.schemaVersion &&
			existingSyncState.lastPushCompletedAt &&
			existingSyncState.lastPullCompletedAt
				? "delta"
				: "full";
		const pushUpdatedAfter =
			syncMode === "delta"
				? (existingSyncState?.lastPushCompletedAt ?? undefined)
				: undefined;
		const pullUpdatedAfter =
			syncMode === "delta"
				? (existingSyncState?.lastPullCompletedAt ?? undefined)
				: undefined;

		if (!syncSessionId) {
			throw new Error("Sync start did not return a session id");
		}

		let syncedRows = 0;
		let syncedTables = 0;
		let pushedRows = 0;
		let pushedTables = 0;
		let pulledRows = 0;
		let pulledTables = 0;

		for (const table of allowedTables) {
			let offset = 0;
			let batchIndex = 0;
			let pushedAnyRow = false;

			while (true) {
				const rows = await db.exportSyncRows({
					table,
					limit: batchLimit,
					offset,
					updatedAfter: pushUpdatedAfter,
				});
				if (rows.length === 0) {
					break;
				}

				await requestJson<never>(`${baseUrl}/api/sync/push`, {
					accessToken,
					body: {
						syncSessionId,
						table,
						batchIndex,
						rows,
					},
				});

				pushedAnyRow = true;
				syncedRows += rows.length;
				pushedRows += rows.length;
				offset += rows.length;
				batchIndex += 1;
			}

			if (pushedAnyRow) {
				syncedTables += 1;
				pushedTables += 1;
			}
		}

		for (const table of allowedTables) {
			let offset = 0;
			let pulledAnyRow = false;

			while (true) {
				const pull = await requestJson<ISyncPullData>(
					`${baseUrl}/api/sync/pull`,
					{
						accessToken,
						body: {
							syncSessionId,
							table,
							limit: batchLimit,
							offset,
							updatedAfter: pullUpdatedAfter,
						},
					},
				);

				const rows = pull.data?.rows ?? [];
				if (rows.length === 0) {
					break;
				}

				await db.applySyncRows({
					table,
					rows,
					userId,
				});

				pulledAnyRow = true;
				syncedRows += rows.length;
				pulledRows += rows.length;
				offset = pull.data?.nextOffset ?? offset + rows.length;

				if (!pull.data?.hasMore) {
					break;
				}
			}

			if (pulledAnyRow) {
				syncedTables += 1;
				pulledTables += 1;
			}
		}

		await requestJson<never>(`${baseUrl}/api/sync/finish`, {
			accessToken,
			body: {
				syncSessionId,
			},
		});

		const completedAt = new Date().toISOString();
		await db.upsertSyncState({
			userId,
			lastSyncSessionId: syncSessionId,
			lastSchemaVersion: localContract.schemaVersion,
			lastSyncedAt: completedAt,
			lastPushCompletedAt: completedAt,
			lastPullCompletedAt: completedAt,
		});

		return {
			syncSessionId,
			syncedRows,
			syncedTables,
			pushedRows,
			pushedTables,
			pulledRows,
			pulledTables,
			syncMode,
		};
	},
);
