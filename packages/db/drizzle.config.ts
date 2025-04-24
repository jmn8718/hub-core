import type { Config } from "drizzle-kit";

export default {
	dialect: process.env.LOCAL_DB ? "sqlite" : "turso",
	schema: "./src/schemas/*",
	dbCredentials: process.env.LOCAL_DB
		? {
				url: process.env.LOCAL_DB,
			}
		: {
				url: process.env.TURSO_DATABASE_URL,
				authToken: process.env.TURSO_DATABASE_AUTH_TOKEN,
			},
	out: "./drizzle",
} satisfies Config;
