// @ts-expect-error
export const LOCAL_DB_FILE = import.meta.env.MAIN_VITE_LOCAL_DB_FILE;
// @ts-expect-error
export const STRAVA_CLIENT_ID = import.meta.env.MAIN_VITE_STRAVA_CLIENT_ID;
export const STRAVA_CLIENT_SECRET =
	// @ts-expect-error
	import.meta.env.MAIN_VITE_STRAVA_CLIENT_SECRET;
export const STRAVA_REDIRECT_URI =
	// @ts-expect-error
	import.meta.env.MAIN_VITE_STRAVA_REDIRECT_URI;

if (!LOCAL_DB_FILE) {
	throw new Error("Missing MAIN_VITE_LOCAL_DB_FILE");
}
if (!STRAVA_CLIENT_ID) {
	throw new Error("Missing MAIN_VITE_STRAVA_CLIENT_ID");
}
if (!STRAVA_CLIENT_SECRET) {
	throw new Error("Missing MAIN_VITE_STRAVA_CLIENT_SECRET");
}
if (!STRAVA_REDIRECT_URI) {
	throw new Error("Missing MAIN_VITE_STRAVA_REDIRECT_URI");
}
