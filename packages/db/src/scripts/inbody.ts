import "dotenv/config";
import { asc } from "drizzle-orm";
import { createDbClient } from "../client.js";
import { inbody } from "../schemas/inbody.js";

async function run() {
	const localDb = createDbClient({
		url: process.env.LOCAL_DB,
	});

	const cloudDb = createDbClient({
		url: process.env.TURSO_DATABASE_URL,
		authToken: process.env.TURSO_AUTH_TOKEN,
	});

	const data = await localDb.select().from(inbody).orderBy(asc(inbody.date));
	await cloudDb.insert(inbody).values(data);
}

run().then(() => {
	console.log("export inbody data complete.");
});
