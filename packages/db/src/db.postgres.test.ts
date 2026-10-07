import { ActivityType, GearType } from "@repo/types";
import { sql } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { type PostgresDbClient, createDbClient } from "./client";
import { Db } from "./db";
import { migrateDb } from "./migrations";

/**
 * Runs the Db class against a real Postgres. Skipped unless
 * POSTGRES_TEST_URL points at a disposable database, for example the
 * docker-compose service: `docker compose up -d db`, create a scratch
 * database once (`CREATE DATABASE hub_test`) and run
 * `pnpm --filter @repo/db test:postgres`.
 *
 * Never point this at a database you care about: every table is truncated.
 */
const POSTGRES_TEST_URL = process.env.POSTGRES_TEST_URL;

const TABLES = [
	"activity_laps",
	"activity_gears",
	"activities_connection",
	"gears_connection",
	"activities",
	"provider_activities",
	"gears",
	"provider_gears",
	"inbody",
	"cache_records",
	"sync_sessions",
	"sync_state",
	"auth_identities",
	"app_users",
];

describe.skipIf(!POSTGRES_TEST_URL)("db on postgres", () => {
	let db: Db;
	let pg: PostgresDbClient;
	let userId = "";

	beforeAll(async () => {
		const client = createDbClient({
			dialect: "postgres",
			url: POSTGRES_TEST_URL as string,
			logger: false,
			max: 2,
		});
		pg = client as unknown as PostgresDbClient;
		await migrateDb(client);
		// Migrations are idempotent.
		await migrateDb(client);
		await pg.execute(
			sql.raw(
				`TRUNCATE TABLE ${TABLES.map((table) => `"${table}"`).join(", ")} CASCADE`,
			),
		);
		db = new Db(client);
		const user = await db.getOrCreateAppUser({
			provider: "supabase",
			providerUserId: "pg-user",
			email: "pg-user@example.com",
		});
		userId = user.userId;
	});

	afterAll(async () => {
		// The pool is attached by drizzle but not part of the declared type.
		await (
			pg as unknown as { $client?: { end: () => Promise<void> } }
		).$client?.end();
	});

	const activityRow = (overrides: Record<string, unknown> = {}) => ({
		id: uuidv7(),
		name: "PG activity",
		timestamp: Date.parse("2026-04-30T22:00:00.000Z"),
		timezone: "Asia/Seoul",
		distance: 5000,
		duration: 1500,
		manufacturer: "sync",
		device: "",
		locationName: "",
		locationCountry: "",
		type: ActivityType.RUN,
		subtype: null,
		notes: "",
		insight: "",
		description: "",
		metadata: "{}",
		isEvent: 0,
		startLatitude: 0,
		startLongitude: 0,
		...overrides,
	});

	test("creates, pushes, pulls and finishes a sync session", async () => {
		const session = await db.createSyncSession({ userId, clientId: "pg" });
		expect(session.startedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
		const row = activityRow();
		const pushed = await db.pushSyncRows({
			userId,
			syncSessionId: session.syncSessionId,
			table: "activities",
			batchIndex: 0,
			rows: [row],
		});
		expect(pushed.processed).eq(1);

		const pulled = await db.pullSyncRows({
			userId,
			syncSessionId: session.syncSessionId,
			table: "activities",
		});
		expect(pulled.rows.map((item) => item.id)).toContain(row.id);
		expect(pulled.hasMore).toBe(false);

		const finished = await db.finishSyncSession({
			userId,
			syncSessionId: session.syncSessionId,
		});
		expect(finished.status).eq("completed");
	});

	test("enforces row ownership and last-writer-wins on upserts", async () => {
		const intruder = await db.getOrCreateAppUser({
			provider: "supabase",
			providerUserId: "pg-intruder",
			email: "pg-intruder@example.com",
		});
		const row = activityRow({
			name: "owned",
			updatedAt: "2026-07-01T00:00:00.000Z",
		});
		await db.applySyncRows({ table: "activities", rows: [row], userId });

		const session = await db.createSyncSession({ userId: intruder.userId });
		await expect(
			db.pushSyncRows({
				userId: intruder.userId,
				syncSessionId: session.syncSessionId,
				table: "activities",
				batchIndex: 0,
				rows: [{ ...row, name: "hijacked" }],
			}),
		).rejects.toThrow(/another user/);
		await expect(
			db.pushSyncRows({
				userId: intruder.userId,
				syncSessionId: session.syncSessionId,
				table: "activity_laps",
				batchIndex: 1,
				rows: [
					{
						id: uuidv7(),
						activityId: row.id,
						lapNumber: 1,
						identifier: "run",
						distance: 1000,
						elapsedTime: 300,
						movingTime: 300,
					},
				],
			}),
		).rejects.toThrow(/reference rows owned by another user/);

		await db.applySyncRows({
			table: "activities",
			rows: [{ ...row, name: "newer", updatedAt: "2026-09-01T00:00:00.000Z" }],
			userId,
		});
		await db.applySyncRows({
			table: "activities",
			rows: [{ ...row, name: "stale", updatedAt: "2026-08-01T00:00:00.000Z" }],
			userId,
		});
		expect((await db.getActivity(row.id))?.name).eq("newer");
	});

	test("buckets overviews by activity timezone and pages activities stably", async () => {
		const before = await db.getActivitiesOverview(12);
		const may = (rows: { month: string; count: number }[]) =>
			rows.find((item) => item.month === "2026 05")?.count ?? 0;
		// Three activities at the same instant, 22:00 UTC April 30 = May 1 KST.
		const rows = [1, 2, 3].map((index) =>
			activityRow({
				name: `Cursor pg ${index}`,
				timestamp: Date.parse("2026-04-30T22:00:00.000Z") + 1,
			}),
		);
		await db.applySyncRows({ table: "activities", rows, userId });
		const after = await db.getActivitiesOverview(12);
		// Duplicate timestamps collapse to one entry per instant.
		expect(may(after)).eq(may(before) + 1);

		const seen = new Set<string>();
		let cursor: string | undefined;
		do {
			const page = await db.getActivities({
				limit: 2,
				cursor,
				search: "Cursor pg",
			});
			for (const activity of page.data) seen.add(activity.id);
			cursor = page.cursor || undefined;
		} while (cursor);
		expect(seen.size).eq(3);
	});

	test("lists gears in a stable order with distances", async () => {
		for (const index of [1, 2, 3]) {
			await db.applySyncRows({
				table: "gears",
				rows: [
					{
						id: uuidv7(),
						name: `Shoes ${index}`,
						code: `shoes-${index}`,
						brand: "",
						type: GearType.SHOES,
						dateBegin: "2026-01-01",
						dateEnd: "",
						maximumDistance: 800,
					},
				],
				userId,
			});
		}
		const first = await db.getGears({ limit: 2 });
		expect(first.data).toHaveLength(2);
		expect(first.cursor).toBeTruthy();
		const second = await db.getGears({ limit: 2, cursor: first.cursor });
		const ids = [...first.data, ...second.data].map((gear) => gear.id);
		expect(new Set(ids).size).eq(ids.length);
		expect(ids).toEqual([...ids].sort());
	});
});
