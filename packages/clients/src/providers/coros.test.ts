import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createTestCacheDb, createTestDb } from "@repo/db/utils";
import { ActivitySubType, ActivityType } from "@repo/types";
import { describe, expect, test, vi } from "vitest";
import { activities, activitiesData } from "../mocks/coros.js";
import { CorosClient } from "./coros.js";

const corosMock = vi.hoisted(() => ({
	login: vi.fn().mockImplementation(() =>
		Promise.resolve({
			userId: "1",
		}),
	),
	getActivitiesList: vi.fn().mockImplementation(() =>
		Promise.resolve({
			count: activities.length,
			totalPage: 1,
			pageNumber: 1,
			dataList: activities,
		}),
	),
	getActivityDetails: vi.fn().mockImplementation((id: string) =>
		// @ts-expect-error
		Promise.resolve(activitiesData[id]),
	),
	getActivityDownloadFile: vi
		.fn()
		.mockResolvedValue("https://example.com/test.fit"),
}));

const downloadFileMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock(import("coros-connect"), () => {
	return {
		CorosApi: vi.fn().mockReturnValue(corosMock),
		downloadFile: downloadFileMock,
	};
});

const createContext = async () => {
	const cache = await createTestCacheDb({
		clearDb: true,
	});
	const db = await createTestDb({
		clearDb: true,
	});
	const client = new CorosClient(db, cache);
	return { client };
};

describe("coros client", () => {
	test("passes sport type to coros file download", async () => {
		const { client, db } = await (async () => {
			const cache = await createTestCacheDb({
				clearDb: true,
			});
			const db = await createTestDb({
				clearDb: true,
			});
			const client = new CorosClient(db, cache);
			return { client, db };
		})();
		await client.connect({
			username: "user1",
			password: "password2",
		});
		const downloadRoot = await mkdtemp(join(tmpdir(), "coros-download-"));
		const swimActivityId = "swim-activity";
		activitiesData[swimActivityId] = {
			...activitiesData["464238568991129601"],
			summary: {
				...activitiesData["464238568991129601"].summary,
				sportType: 300,
				name: "Pool Swim",
			},
		};
		await db.insertActivity({
			activity: {
				data: {
					id: "db-swim",
					name: "Pool Swim",
					timestamp: Date.now(),
					timezone: "Etc/UTC",
					distance: 1000,
					duration: 600,
					manufacturer: "coros",
					locationName: "",
					locationCountry: "",
					startLatitude: 0,
					startLongitude: 0,
					type: ActivityType.SWIM,
					subtype: undefined,
					isEvent: 0,
				},
				providerActivity: {
					id: swimActivityId,
					provider: "COROS",
					original: true,
					timestamp: Date.now(),
					data: "{}",
				},
			},
		});
		try {
			await client.downloadActivity(swimActivityId, downloadRoot);
			expect(corosMock.getActivityDownloadFile).toHaveBeenCalledWith({
				activityId: swimActivityId,
				fileType: "fit",
				sportType: "300",
			});
			expect(downloadFileMock).toHaveBeenCalled();
		} finally {
			await rm(downloadRoot, { recursive: true, force: true });
		}
	});

	test("should sync with coros and fetch all the activities", async () => {
		const { client } = await createContext();
		await client.connect({
			username: "user1",
			password: "password2",
		});
		const data = await client.sync({});
		expect(data.length).toEqual(activities.length);
		data.forEach((row, index) => {
			expect(row).toHaveProperty("activity");
			expect(row.activity.providerActivity?.id).to.equal(
				activities[index].labelId.toString(),
			);
			expect(row).not.toHaveProperty("gears");
		});
	});

	test("maps indoor running activities to indoor subtype", async () => {
		const { client } = await createContext();
		await client.connect({
			username: "user1",
			password: "password2",
		});
		const indoorActivityId = "indoor-run";
		activitiesData[indoorActivityId] = {
			...activitiesData["464238568991129601"],
			sportType: 101,
			summary: {
				...activitiesData["464238568991129601"].summary,
				sportType: 101,
				name: "Indoor Run",
			},
		};
		const result = await client.syncActivity(indoorActivityId);
		expect(result.activity.data.subtype).toBe(ActivitySubType.INDOOR);
	});

	test("maps unknown coros sport types to other", async () => {
		const { client } = await createContext();
		await client.connect({
			username: "user1",
			password: "password2",
		});
		const unknownActivityId = "other-activity";
		activitiesData[unknownActivityId] = {
			...activitiesData["464238568991129601"],
			summary: {
				...activitiesData["464238568991129601"].summary,
				sportType: 999,
				name: "Other Activity",
			},
		};
		const result = await client.syncActivity(unknownActivityId, 999);
		expect(result.activity.data.type).toBe(ActivityType.OTHER);
		expect(result.activity.data.subtype).toBeUndefined();
	});

	test("maps cycling activities to bike type", async () => {
		const { client } = await createContext();
		await client.connect({
			username: "user1",
			password: "password2",
		});
		const bikeActivityId = "bike-activity";
		activitiesData[bikeActivityId] = {
			...activitiesData["464238568991129601"],
			summary: {
				...activitiesData["464238568991129601"].summary,
				sportType: 200,
				name: "Bike Activity",
			},
		};
		const result = await client.syncActivity(bikeActivityId, 200);
		expect(result.activity.data.type).toBe(ActivityType.BIKE);
		expect(result.activity.data.subtype).toBeUndefined();
	});

	test("maps strength activities to gym type", async () => {
		const { client } = await createContext();
		await client.connect({
			username: "user1",
			password: "password2",
		});
		const gymActivityId = "gym-activity";
		activitiesData[gymActivityId] = {
			...activitiesData["464238568991129601"],
			summary: {
				...activitiesData["464238568991129601"].summary,
				sportType: 402,
				name: "Strength Activity",
			},
		};
		const result = await client.syncActivity(gymActivityId, 402);
		expect(result.activity.data.type).toBe(ActivityType.GYM);
		expect(result.activity.data.subtype).toBeUndefined();
	});
});
