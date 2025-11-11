import "dotenv/config";
import { createClient } from "@libsql/client";

// script to manipulate the database directly
async function run() {
	const client = createClient(
		process.env.LOCAL_DB
			? {
					url: process.env.LOCAL_DB,
				}
			: {
					url: process.env.TURSO_DATABASE_URL,
					authToken: process.env.TURSO_AUTH_TOKEN,
				},
	);

	const record = {
		hash: "64c075c35d5cfea19ce9ef265aac9a2ca144c6fd7400827a590e1ea7b0c992c5",
		created_at: 1762333526723,
	};
	const result = await client.execute({
		sql: "SELECT * FROM __drizzle_migrations WHERE created_at > ?;",
		args: [record.created_at],
	});
	console.log(result);
	if (result.rows.length > 0) {
		console.log("Deleting migrations...", result.rows.length);
		const deleteResult = await client.execute({
			sql: "DELETE FROM __drizzle_migrations WHERE created_at > ?;",
			args: [record.created_at],
		});
		console.log("Deleted migrations:", deleteResult);

		const insertResult = await client.execute({
			sql: "INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?);",
			args: [record.hash, record.created_at],
		});
		console.log("Inserted migration record:", insertResult);
	}
}

run().catch((error) => {
	console.error(error);
	process.exit(1);
});
