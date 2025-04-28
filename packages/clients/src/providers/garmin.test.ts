import { describe, expect, test, vi } from "vitest";
import { activities, activitiesData, gears } from "../mocks/garmin.js";
import { Cache } from "./cache.js";
import { GarminClient } from "./garmin.js";

vi.mock(import("garmin-connect"), async (importOriginal) => {
	const mod = await importOriginal();
	return {
		...mod,
		GarminConnect: vi.fn().mockReturnValue({
			login: vi.fn().mockImplementation(() => Promise.resolve()),
			getActivities: vi
				.fn()
				.mockImplementation(() => Promise.resolve(activities)),
			getActivity: vi
				.fn()
				.mockImplementation(({ activityId }: { activityId: string }) =>
					Promise.resolve(activitiesData[activityId]),
				),
			getActivityGear: vi.fn().mockImplementation(() => Promise.resolve(gears)),
		}),
	};
});

describe("coros client", () => {
	const client = new GarminClient(new Cache());

	test("should fetch all the activities", async () => {
		await client.connect({
			username: "user1",
			password: "password2",
		});
		const data = await client.sync({});
		expect(data.length).toEqual(2);
		// biome-ignore lint/complexity/noForEach: <explanation>
		data.forEach((row) => {
			expect(row).toHaveProperty("activity");
			expect(row).toHaveProperty("gears");
			// biome-ignore lint/style/noNonNullAssertion: <explanation>
			expect(row.gears!.length).toEqual(2);
		});
	});

	test("should fetch no new activities", async () => {
		await client.connect({
			username: "user1",
			password: "password2",
		});
		const data = await client.sync({
			// biome-ignore lint/style/noNonNullAssertion: <explanation>
			id: activities[0]!.activityId.toString(),
		});
		expect(data.length).toEqual(0);
	});
});
