import "dotenv/config";
import { createDbClient } from "../client.js";
import { clearData, importData, importInbodyData } from "./common.js";

async function run() {
	const client = createDbClient(
		process.env.LOCAL_DB
			? {
					url: process.env.LOCAL_DB,
					logger: false,
				}
			: {
					url: process.env.TURSO_DATABASE_URL,
					authToken: process.env.TURSO_AUTH_TOKEN,
					logger: false,
				},
	);

	await clearData(client);
	console.log("--- db cleared");
	await importData(client);
	console.log("--- db data imported");
	await importInbodyData(client);
	console.log("--- db inbody data imported");
}

run().then(() => {
	console.log("Seeding complete.");
});
