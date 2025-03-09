import type { Config } from "drizzle-kit";

export default {
	dialect: "turso",
	schema: "./src/db/schema/*",
	dbCredentials: {
		url: process.env.TURSO_DATABASE_URL!,
		authToken: process.env.TURSO_DATABASE_AUTH_TOKEN!,
	},
	out: "./drizzle",
} satisfies Config;
