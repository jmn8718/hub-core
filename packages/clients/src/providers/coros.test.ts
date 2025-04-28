import { describe, expect, test, vi } from "vitest";
import { activities, activitiesData } from "../mocks/coros.js";
import { Cache } from "./cache.js";
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
			getActivityDetails: vi
				.fn()
				.mockImplementation((id: string) =>
					Promise.resolve(activitiesData[id]),
				),
		}),
	};
});

describe("coros client", () => {
	const client = new CorosClient(new Cache());

	test("should connect", async () => {
		await client.connect({
			username: "user1",
			password: "password2",
		});
		const data = await client.sync({});
		expect(data.length).toEqual(2);
		// biome-ignore lint/complexity/noForEach: <explanation>
		data.forEach((row) => {
			expect(row).toHaveProperty("activity");
			expect(row).not.toHaveProperty("gears");
		});
	});
});
