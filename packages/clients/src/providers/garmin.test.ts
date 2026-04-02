import { createTestCacheDb, createTestDb } from "@repo/db/utils";
import { ActivityType } from "@repo/types";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { activities, activitiesData, gears } from "../mocks/garmin.js";
import { GarminClient } from "./garmin.js";

const loginMock = vi.fn();
const getActivitiesMock = vi.fn();
const getActivityMock = vi.fn();
const getActivityGearMock = vi.fn();
const exportTokenMock = vi.fn();
const loadTokenMock = vi.fn();
const getUserProfileMock = vi.fn();

vi.mock(import("garmin-connect"), async (importOriginal) => {
	const mod = await importOriginal();
	return {
		...mod,
		GarminConnect: vi.fn().mockImplementation(() => ({
			login: loginMock,
			exportToken: exportTokenMock,
			loadToken: loadTokenMock,
			getUserProfile: getUserProfileMock,
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

describe.sequential("garmin client", () => {
	beforeEach(() => {
		loginMock.mockReset();
		exportTokenMock.mockReset();
		loadTokenMock.mockReset();
		getUserProfileMock.mockReset();
		getActivitiesMock.mockReset();
		getActivityMock.mockReset();
		getActivityGearMock.mockReset();
		loginMock.mockResolvedValue(undefined);
		exportTokenMock.mockReturnValue({
			oauth1: {
				oauth_token: "oauth1-token",
				oauth_token_secret: "oauth1-secret",
			},
			oauth2: {
				access_token: "access-token",
				refresh_token: "refresh-token",
				token_type: "Bearer",
				expires_in: 3600,
				expires_at: Date.now() + 3600 * 1000,
			},
		});
		loadTokenMock.mockReturnValue(undefined);
		getUserProfileMock.mockResolvedValue({ id: 1 });
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

	test("keeps manually created garmin activities as manual manufacturer", async () => {
		const { client } = await createContext();
		await client.connect({
			username: "user1",
			password: "password2",
		});
		getActivityMock.mockResolvedValueOnce({
			...activitiesData["17936939301"],
			activityId: 999999,
			metadataDTO: {
				...activitiesData["17936939301"].metadataDTO,
				manualActivity: true,
				manufacturer: "",
				deviceMetaDataDTO: {
					...activitiesData["17936939301"].metadataDTO.deviceMetaDataDTO,
					deviceId: "123",
				},
			},
			activityTypeDTO: {
				...activitiesData["17936939301"].activityTypeDTO,
				typeKey: "workout",
			},
		});

		const result = await client.syncActivity("999999");
		expect(result.activity.data.manufacturer).toBe("manual");
		expect(result.activity.providerActivity?.original).toBe(false);
	});

	test("maps running metadata from garmin activity details", async () => {
		const { client } = await createContext();
		await client.connect({
			username: "user1",
			password: "password2",
		});

		const result = await client.syncActivity("17936939301");
		expect(result.activity.data.type).toBe(ActivityType.RUN);
		expect(result.activity.data.metadata?.averagePace).toBeCloseTo(
			1000 / activitiesData["17936939301"].summaryDTO.averageSpeed,
			5,
		);
		expect(result.activity.data.metadata?.averageHeartRate).toBe(
			activitiesData["17936939301"].summaryDTO.averageHR,
		);
		expect(result.activity.data.metadata?.maximumHeartRate).toBe(
			activitiesData["17936939301"].summaryDTO.maxHR,
		);
	});
});
