/// <reference types="node" />

import type { Config } from "drizzle-kit";

const url = process.env.POSTGRES_URL;

if (!url) {
	throw new Error("Missing Postgres connection string. Set POSTGRES_URL.");
}

export default {
	dialect: "postgresql",
	schema: "./src/schemas/postgres/*",
	dbCredentials: {
		url,
	},
	out: "./drizzle-postgres",
} satisfies Config;
