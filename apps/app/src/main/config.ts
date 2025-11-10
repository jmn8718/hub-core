// @ts-expect-error
export const LOCAL_DB_FILE = import.meta.env.MAIN_VITE_LOCAL_DB_FILE;

if (!LOCAL_DB_FILE) {
	throw new Error("Missing MAIN_VITE_LOCAL_DB_FILE");
}
