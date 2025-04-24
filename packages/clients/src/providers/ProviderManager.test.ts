import { Db, createDbClient } from "@repo/db";
import { Providers } from "@repo/types";
import { describe, expect, test, vi } from "vitest";
import { gears } from "../mocks/garmin.js";
import { ProviderManager } from "./ProviderManager.js";

vi.mock(import("garmin-connect"), async (importOriginal) => {
	const mod = await importOriginal();
	return {
		...mod,
		GarminConnect: vi.fn().mockReturnValue({
			login: vi.fn().mockImplementation(() => Promise.resolve()),
			getUserSettings: vi.fn().mockImplementation(() => {
				return Promise.resolve({ id: 1 });
			}),
			getGears: vi.fn().mockImplementation(() => Promise.resolve(gears)),
		}),
	};
});

describe("coros client", () => {
	const client = createDbClient({
		url: "file:../../test.sqlite",
		logger: false,
	});
	const db = new Db(client);
	const provider = new ProviderManager(db);

	provider.initializeClient(Providers.GARMIN);

	test("should sync gear", async () => {
		await provider.connect(Providers.GARMIN, {
			username: "user1",
			password: "password2",
		});
		const result = await provider.syncGears(Providers.GARMIN);
		expect(result.length).to.eq(gears.length);
	});
});
