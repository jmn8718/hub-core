import { createTestCacheDb, createTestDb } from "@repo/db/utils";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { activities, activitiesData, gears } from "../mocks/garmin.js";
import { GarminClient } from "./garmin.js";

const loginMock = vi.fn();
const getActivitiesMock = vi.fn();
const getActivityMock = vi.fn();
const getActivityGearMock = vi.fn();

vi.mock(import("garmin-connect"), async (importOriginal) => {
	const mod = await importOriginal();
	return {
		...mod,
		GarminConnect: vi.fn().mockImplementation(() => ({
			login: loginMock,
			getActivities: getActivitiesMock,
			getActivity: getActivityMock,
			getActivityGear: getActivityGearMock,
		})),
	};
});

const createContext = async () => {
	const cache = await createTestCacheDb({
		clearDb: true,
	});
	const db = await createTestDb({
		clearDb: true,
	});
	const client = new GarminClient(db, cache);
	return { client };
};

describe("garmin client", () => {
	beforeEach(() => {
		loginMock.mockResolvedValue(undefined);
		getActivitiesMock.mockResolvedValue(activities);
		getActivityMock.mockImplementation(
			({ activityId }: { activityId: string }) =>
				Promise.resolve(
					// @ts-expect-error - typing mismatch in mock data
					activitiesData[activityId],
				),
		);
		getActivityGearMock.mockResolvedValue(gears);
	});

	test("fetches activities and attaches gear", async () => {
		const { client } = await createContext();
		await client.connect({
			username: "user1",
			password: "password2",
		});
		const data = await client.sync({});
		expect(data).toHaveLength(2);
		expect(data[0]?.gears).toBeDefined();
	});

	test("returns empty list when last id already synced", async () => {
		const { client } = await createContext();
		await client.connect({
			username: "user1",
			password: "password2",
		});
		const latestId = activities[0].activityId.toString();
		const data = await client.sync({ id: latestId });
		expect(data).toHaveLength(0);
	});

	test("filters activities up to last known id", async () => {
		getActivitiesMock.mockResolvedValue(activities);
		const { client } = await createContext();
		await client.connect({
			username: "user1",
			password: "password2",
		});
		const results = await client.sync({
			id: activities[1].activityId.toString(),
		});
		expect(results).toHaveLength(1);
		expect(results[0]?.activity?.providerActivity?.id).toBe(
			activities[0].activityId.toString(),
		);
	});
});
