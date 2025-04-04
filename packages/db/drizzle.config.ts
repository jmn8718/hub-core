/* eslint-disable turbo/no-undeclared-env-vars */
import type { Config } from "drizzle-kit";

if (process.env.TURSO_DATABASE_URL) {
	throw new Error("");
}

if (!process.env.TURSO_DATABASE_AUTH_TOKEN) {
	throw new Error("");
}
export default {
	dialect: "turso",
	schema: "./src/db/schema/*",
	dbCredentials: {
		url: process.env.TURSO_DATABASE_URL,
		authToken: process.env.TURSO_DATABASE_AUTH_TOKEN,
	},
	out: "./drizzle",
} satisfies Config;
