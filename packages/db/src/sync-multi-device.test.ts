import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ActivityType, type SyncTableName } from "@repo/types";
import { uuidv7 } from "uuidv7";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { createDbClient } from "./client";
import { Db } from "./db";
import { migrateDb } from "./migrations";

/**
 * Two desktop databases ("devices") syncing through a third one that plays
 * the server. The helper below mirrors the desktop runCloudSync loop:
 * export rows changed since the device's push watermark, push them, then
 * pull rows changed since its pull watermark and apply them locally.
 */

const SCHEMA_VERSION = "test";

async function createDatabase(dir: string, name: string) {
	const client = createDbClient({
		url: `file:${join(dir, `${name}.sqlite`)}`,
		logger: false,
	});
	await migrateDb(client);
	return { client, db: new Db(client) };
}

async function cloudSync(params: {
	device: Db;
	server: Db;
	userId: string;
	mode?: "sync" | "pull";
}) {
	const { device, server, userId } = params;
	const mode = params.mode ?? "sync";
	const state = await device.getSyncState({ userId });
	const pushUpdatedAfter = state?.lastPushCompletedAt ?? undefined;
	const pullUpdatedAfter = state?.lastPullCompletedAt ?? undefined;

	// Watermarks are taken before anything is exported, like the desktop app.
	const localStartedAt = new Date().toISOString();
	const session = await server.createSyncSession({
		userId,
		clientId: "device",
		schemaVersion: SCHEMA_VERSION,
	});
	const tables: SyncTableName[] = session.allowedTables;

	if (mode === "sync") {
		for (const table of tables) {
			let offset = 0;
			let batchIndex = 0;
			while (true) {
				const rows = await device.exportSyncRows({
					table,
					limit: session.batchLimit,
					offset,
					updatedAfter: pushUpdatedAfter,
				});
				if (rows.length === 0) break;
				await server.pushSyncRows({
					userId,
					syncSessionId: session.syncSessionId,
					table,
					batchIndex,
					rows,
				});
				offset += rows.length;
				batchIndex += 1;
			}
		}
	}

	for (const table of tables) {
		let offset = 0;
		while (true) {
			const pull = await server.pullSyncRows({
				userId,
				syncSessionId: session.syncSessionId,
				table,
				limit: session.batchLimit,
				offset,
				updatedAfter: pullUpdatedAfter,
			});
			if (pull.rows.length === 0) break;
			await device.applySyncRows({ table, rows: pull.rows, userId });
			offset = pull.nextOffset;
			if (!pull.hasMore) break;
		}
	}

	await server.finishSyncSession({
		userId,
		syncSessionId: session.syncSessionId,
	});
	await device.upsertSyncState({
		userId,
		lastSyncSessionId: session.syncSessionId,
		lastSchemaVersion: SCHEMA_VERSION,
		lastSyncedAt: new Date().toISOString(),
		lastPushCompletedAt:
			mode === "sync" ? localStartedAt : (state?.lastPushCompletedAt ?? null),
		lastPullCompletedAt: session.startedAt,
	});
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("multi-device cloud sync", () => {
	let dir = "";
	let server: Db;
	let deviceA: Db;
	let deviceB: Db;
	let userId = "";
	let sharedActivityId = "";

	beforeAll(async () => {
		dir = await mkdtemp(join(tmpdir(), "hub-core-sync-test-"));
		server = (await createDatabase(dir, "server")).db;
		deviceA = (await createDatabase(dir, "device-a")).db;
		deviceB = (await createDatabase(dir, "device-b")).db;
		const user = await server.getOrCreateAppUser({
			provider: "supabase",
			providerUserId: "multi-device-user",
			email: "multi@example.com",
		});
		userId = user.userId;
	});

	afterAll(async () => {
		await rm(dir, { recursive: true, force: true });
	});

	test("propagates a new activity from one device to another", async () => {
		const created = await deviceA.createActivity({
			name: "From device A",
			type: ActivityType.OTHER,
			timestamp: "2026-06-01T08:00:00.000Z",
			timezone: "Asia/Seoul",
			durationSeconds: 600,
		});
		sharedActivityId = created.id;

		await cloudSync({ device: deviceA, server, userId });
		await cloudSync({ device: deviceB, server, userId });

		const onB = await deviceB.getActivity(created.id);
		expect(onB?.name).eq("From device A");
		expect((await server.getActivity(created.id))?.name).eq("From device A");
	});

	test("delivers a later edit made on the other device", async () => {
		const activity = await deviceB.getActivity(sharedActivityId);
		expect(activity).toBeTruthy();
		if (!activity) throw new Error("expected synced activity");

		await wait(5);
		await deviceB.editActivity(activity.id, { name: "Renamed on device B" });
		await cloudSync({ device: deviceB, server, userId });
		await cloudSync({ device: deviceA, server, userId });

		expect((await deviceA.getActivity(activity.id))?.name).eq(
			"Renamed on device B",
		);
	});

	test("never lets a stale copy overwrite a newer edit", async () => {
		const activity = await deviceA.getActivity(sharedActivityId);
		if (!activity) throw new Error("expected synced activity");

		// Device A edits first, device B edits later; A syncs last.
		await wait(5);
		await deviceA.editActivity(activity.id, { name: "Older edit on A" });
		await wait(5);
		await deviceB.editActivity(activity.id, { name: "Newer edit on B" });

		await cloudSync({ device: deviceB, server, userId });
		await cloudSync({ device: deviceA, server, userId });

		expect((await server.getActivity(sharedActivityId))?.name).eq(
			"Newer edit on B",
		);
		// A pulled the newer row back and dropped its stale edit.
		expect((await deviceA.getActivity(activity.id))?.name).eq(
			"Newer edit on B",
		);
	});

	test("picks up rows written while a sync was running on the next delta", async () => {
		// Simulate a provider import landing after the push watermark was taken
		// but before the sync completed: the watermark is "before export", so the
		// next delta push must still include the row.
		const state = await deviceA.getSyncState({ userId });
		expect(state?.lastPushCompletedAt).toBeTruthy();
		await wait(5);
		const lateId = uuidv7();
		await deviceA.applySyncRows({
			table: "activities",
			rows: [
				{
					id: lateId,
					name: "Imported during sync",
					timestamp: Date.parse("2026-06-02T08:00:00.000Z"),
					timezone: "Asia/Seoul",
					distance: 0,
					duration: 0,
					manufacturer: "",
					device: "",
					locationName: "",
					locationCountry: "",
					type: ActivityType.OTHER,
					subtype: null,
					notes: "",
					insight: "",
					description: "",
					metadata: "{}",
					isEvent: 0,
					startLatitude: 0,
					startLongitude: 0,
					updatedAt: new Date().toISOString(),
				},
			],
			userId,
		});

		await cloudSync({ device: deviceA, server, userId });
		await cloudSync({ device: deviceB, server, userId, mode: "pull" });
		expect((await deviceB.getActivity(lateId))?.name).eq(
			"Imported during sync",
		);
	});

	test("rejects a device acting for another user on the same rows", async () => {
		const intruder = await server.getOrCreateAppUser({
			provider: "supabase",
			providerUserId: "multi-device-intruder",
			email: "intruder@example.com",
		});
		const rows = await deviceA.exportSyncRows({
			table: "activities",
			limit: 10,
		});
		const session = await server.createSyncSession({ userId: intruder.userId });
		await expect(
			server.pushSyncRows({
				userId: intruder.userId,
				syncSessionId: session.syncSessionId,
				table: "activities",
				batchIndex: 0,
				rows,
			}),
		).rejects.toThrow(/another user/);
		expect((await server.getActivity(sharedActivityId))?.name).eq(
			"Newer edit on B",
		);
	});
});
