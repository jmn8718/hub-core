import { ProviderManager } from "@repo/clients";
import { CacheDb, Db } from "@repo/db";
import { Providers } from "@repo/types";
import db from "./db";

export const provider = new ProviderManager(new Db(db), new CacheDb(db));

if (process.env.COROS_USERNAME && process.env.COROS_PASSWORD) {
	provider.initializeClient({
		provider: Providers.COROS,
	});
	provider.connect(Providers.COROS, {
		username: process.env.COROS_USERNAME,
		password: process.env.COROS_PASSWORD,
	});
}

if (process.env.GARMIN_USERNAME && process.env.GARMIN_PASSWORD) {
	provider.initializeClient({
		provider: Providers.GARMIN,
	});
	provider.connect(Providers.GARMIN, {
		username: process.env.GARMIN_USERNAME,
		password: process.env.GARMIN_PASSWORD,
	});
}
