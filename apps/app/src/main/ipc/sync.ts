import {
	CLOUD_SYNC_SCHEMA_VERSION,
	Channels,
	type ICloudSyncResult,
	type ISyncPullData,
	type ISyncStateData,
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

interface SupabaseAuthSessionResponse {
	access_token: string;
	refresh_token: string;
	expires_in?: number;
	expires_at?: number;
	token_type?: string;
	user?: {
		id: string;
		email?: string | null;
		[key: string]: unknown;
	};
	[key: string]: unknown;
}

function isSupabaseAuthSessionResponse(
	value: unknown,
): value is SupabaseAuthSessionResponse {
	return (
		!!value &&
		typeof value === "object" &&
		typeof (value as SupabaseAuthSessionResponse).access_token === "string" &&
		typeof (value as SupabaseAuthSessionResponse).refresh_token === "string"
	);
}

function maskEmail(email: string) {
	const [localPart = "", domain = ""] = email.split("@");
	if (!domain) {
		return "***";
	}
	if (localPart.length <= 2) {
		return `${localPart[0] ?? "*"}***@${domain}`;
	}
	return `${localPart.slice(0, 2)}***@${domain}`;
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

async function requestSupabaseAuthSession(params: {
	supabaseUrl: string;
	supabaseAnonKey: string;
	email: string;
	password: string;
}): Promise<SupabaseAuthSessionResponse> {
	const baseUrl = params.supabaseUrl.replace(/\/$/, "");
	console.info("[cloud-signin] requesting Supabase session", {
		supabaseUrl: baseUrl,
		email: maskEmail(params.email),
	});

	let response: Response;
	try {
		response = await fetch(`${baseUrl}/auth/v1/token?grant_type=password`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				apikey: params.supabaseAnonKey,
			},
			body: JSON.stringify({
				email: params.email,
				password: params.password,
			}),
		});
	} catch (error) {
		console.error("[cloud-signin] Supabase fetch failed", {
			supabaseUrl: baseUrl,
			email: maskEmail(params.email),
			error,
		});
		throw error;
	}

	const json = (await response.json().catch(() => null)) as
		| SupabaseAuthSessionResponse
		| { error_description?: string; msg?: string }
		| null;

	if (!response.ok) {
		console.error("[cloud-signin] Supabase sign-in rejected", {
			supabaseUrl: baseUrl,
			email: maskEmail(params.email),
			status: response.status,
			statusText: response.statusText,
			body: json,
		});
		const message =
			json && typeof json === "object" && "error_description" in json
				? (json.error_description ?? json.msg ?? "Supabase sign-in failed")
				: "Supabase sign-in failed";
		throw new Error(
			typeof message === "string" ? message : "Supabase sign-in failed",
		);
	}

	if (!isSupabaseAuthSessionResponse(json)) {
		console.error("[cloud-signin] Supabase sign-in returned invalid session", {
			supabaseUrl: baseUrl,
			email: maskEmail(params.email),
			body: json,
		});
		throw new Error("Supabase sign-in returned no session");
	}

	console.info("[cloud-signin] Supabase session acquired", {
		supabaseUrl: baseUrl,
		email: maskEmail(params.email),
		userId: json.user?.id ?? null,
	});
	return json;
}

async function requestSupabaseSignOut(params: {
	supabaseUrl: string;
	supabaseAnonKey: string;
	accessToken: string;
}) {
	const baseUrl = params.supabaseUrl.replace(/\/$/, "");
	const response = await fetch(`${baseUrl}/auth/v1/logout`, {
		method: "POST",
		headers: {
			apikey: params.supabaseAnonKey,
			Authorization: `Bearer ${params.accessToken}`,
		},
	});

	if (!response.ok) {
		const json = (await response.json().catch(() => null)) as {
			error_description?: string;
			msg?: string;
		} | null;
		throw new Error(
			json?.error_description || json?.msg || "Supabase sign-out failed",
		);
	}
}

ipcMain.handle(
	Channels.DB_CLOUD_SIGNIN,
	async (
		_event,
		{
			supabaseUrl,
			supabaseAnonKey,
			email,
			password,
		}: {
			supabaseUrl: string;
			supabaseAnonKey: string;
			email: string;
			password: string;
		},
	): Promise<SupabaseAuthSessionResponse> => {
		if (!supabaseUrl) {
			throw new Error("Missing Supabase URL");
		}
		if (!supabaseAnonKey) {
			throw new Error("Missing Supabase anon key");
		}
		if (!email.trim() || !password) {
			throw new Error("Missing Supabase email or password");
		}

		try {
			return await requestSupabaseAuthSession({
				supabaseUrl,
				supabaseAnonKey,
				email: email.trim(),
				password,
			});
		} catch (error) {
			console.error("[cloud-signin] IPC sign-in failed", {
				supabaseUrl,
				email: maskEmail(email.trim()),
				error,
			});
			throw error;
		}
	},
);

ipcMain.handle(
	Channels.DB_CLOUD_SIGNOUT,
	async (
		_event,
		{
			supabaseUrl,
			supabaseAnonKey,
			accessToken,
		}: {
			supabaseUrl: string;
			supabaseAnonKey: string;
			accessToken: string;
		},
	): Promise<true> => {
		if (!supabaseUrl) {
			throw new Error("Missing Supabase URL");
		}
		if (!supabaseAnonKey) {
			throw new Error("Missing Supabase anon key");
		}
		if (!accessToken) {
			throw new Error("Missing Supabase access token");
		}

		await requestSupabaseSignOut({
			supabaseUrl,
			supabaseAnonKey,
			accessToken,
		});
		return true;
	},
);

ipcMain.handle(
	Channels.DB_CLOUD_SYNC_STATE,
	async (
		_event,
		{
			userId,
		}: {
			userId: string;
		},
	): Promise<ISyncStateData | null> => {
		if (!userId) {
			throw new Error("Missing sync user id");
		}

		return getDb().getSyncState({ userId });
	},
);

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

async function runCloudSync(params: {
	accessToken: string;
	apiBaseUrl: string;
	mode: "pull" | "sync";
}): Promise<ICloudSyncResult> {
	if (!params.accessToken) {
		throw new Error("Missing Supabase access token");
	}
	if (!params.apiBaseUrl) {
		throw new Error("Missing API base URL");
	}

	const baseUrl = params.apiBaseUrl.replace(/\/$/, "");
	const db = getDb();
	const localContract = getDesktopSyncContract();
	const validation = await requestJson<ISyncValidateData>(
		`${baseUrl}/api/sync/validate`,
		{
			accessToken: params.accessToken,
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
		accessToken: params.accessToken,
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

	if (params.mode === "sync") {
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
					accessToken: params.accessToken,
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
	}

	for (const table of allowedTables) {
		let offset = 0;
		let pulledAnyRow = false;

		while (true) {
			const pull = await requestJson<ISyncPullData>(
				`${baseUrl}/api/sync/pull`,
				{
					accessToken: params.accessToken,
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
		accessToken: params.accessToken,
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
		lastPushCompletedAt:
			params.mode === "sync"
				? completedAt
				: (existingSyncState?.lastPushCompletedAt ?? null),
		lastPullCompletedAt: completedAt,
	});

	return {
		direction: params.mode,
		syncSessionId,
		syncedRows,
		syncedTables,
		pushedRows,
		pushedTables,
		pulledRows,
		pulledTables,
		syncMode,
	};
}

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
	): Promise<ICloudSyncResult> =>
		runCloudSync({
			accessToken,
			apiBaseUrl,
			mode: "sync",
		}),
);

ipcMain.handle(
	Channels.DB_CLOUD_PULL,
	async (
		_event,
		{
			accessToken,
			apiBaseUrl,
		}: {
			accessToken: string;
			apiBaseUrl: string;
		},
	): Promise<ICloudSyncResult> =>
		runCloudSync({
			accessToken,
			apiBaseUrl,
			mode: "pull",
		}),
);
