import "dotenv/config";
import { createDbClient } from "../client.js";
import { gears, gearsConnection, providerGears } from "../schemas/app.js";

async function run() {
	const localDb = createDbClient({
		url: process.env.LOCAL_DB,
	});

	const cloudDb = createDbClient({
		url: process.env.TURSO_DATABASE_URL,
		authToken: process.env.TURSO_AUTH_TOKEN,
	});

	const gearsData = await localDb.select().from(gears);
	await cloudDb.insert(gears).values(gearsData);
	const providerGearsData = await localDb.select().from(providerGears);
	await cloudDb.insert(providerGears).values(providerGearsData);
	const gearsConnectionData = await localDb.select().from(gearsConnection);
	await cloudDb.insert(gearsConnection).values(gearsConnectionData);
}

run().then(() => {
	console.log("export gears data complete.");
});
