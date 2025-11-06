/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_APP_TITLE: string;
	readonly MAIN_VITE_LOCAL_DB_FILE: string;
	readonly MAIN_VITE_CACHE_DB: string;
	readonly MAIN_VITE_STRAVA_CLIENT_ID?: string;
	readonly MAIN_VITE_STRAVA_CLIENT_SECRET?: string;
	readonly MAIN_VITE_STRAVA_REDIRECT_URI?: string;
	// more env variables...
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
