import { join } from "node:path";
import { app } from "electron";

const DB_FILE_NAME = "hubcore.db";

/**
 * Location of the local SQLite database.
 *
 * Packaged builds always use the per-user data directory. During development
 * MAIN_VITE_LOCAL_DB_FILE (a libsql URL such as file:/path/to/hubcore.db) can
 * point at another file; it is a build-time value, so it is never honoured in
 * a packaged app.
 */
export function getLocalDbFile(): string {
	const override = import.meta.env.MAIN_VITE_LOCAL_DB_FILE;
	if (!app.isPackaged && override) {
		return override;
	}
	return `file:${join(app.getPath("userData"), DB_FILE_NAME)}`;
}
