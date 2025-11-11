import { createTestCacheDb, createTestDb } from "@repo/db/utils";
import { describe, expect, test, vi } from "vitest";
import { activities, activitiesData } from "../mocks/coros.js";
import { CorosClient } from "./coros.js";

vi.mock(import("coros-connect"), () => {
	return {
		CorosApi: vi.fn().mockReturnValue({
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
		}),
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
});
