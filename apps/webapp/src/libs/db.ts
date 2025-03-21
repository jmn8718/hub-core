import { Db, createDbClient } from "@repo/db";

if (!import.meta.env.VITE_TURSO_DATABASE_URL) {
	console.warn("Missing VITE_TURSO_DATABASE_URL");
	throw new Error("Missing VITE_TURSO_DATABASE_URL");
}
if (!import.meta.env.VITE_TURSO_AUTH_TOKEN) {
	console.warn("Missing VITE_TURSO_AUTH_TOKEN");
	throw new Error("Missing VITE_TURSO_AUTH_TOKEN");
}
const dbClient = createDbClient({
	url: import.meta.env.VITE_TURSO_DATABASE_URL,
	authToken: import.meta.env.VITE_TURSO_AUTH_TOKEN,
});

export const db = new Db(dbClient);
