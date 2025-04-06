import { CorosClient, ProviderManager } from "@repo/clients";
import { Db } from "@repo/db";
import db from "./db";

export const provider = new ProviderManager(new Db(db));

if (process.env.COROS_USERNAME && process.env.COROS_PASSWORD) {
	const coros = new CorosClient();
	provider.addClient(CorosClient.PROVIDER, coros);
	provider.connect(CorosClient.PROVIDER, {
		username: process.env.COROS_USERNAME,
		password: process.env.COROS_PASSWORD,
	});
}
