namespace NodeJS {
	interface ProcessEnv {
		NEXT_PUBLIC_SUPABASE_URL: string;
		NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
		STRAVA_CLIENT_ID: string;
		STRAVA_CLIENT_SECRET: string;
		STRAVA_REFRESH_TOKEN?: string;
		STRAVA_REDIRECT_URI?: string;
		STRAVA_VERIFY_TOKEN: string;
		COROS_USERNAME?: string;
		COROS_PASSWORD?: string;
		GARMIN_USERNAME?: string;
		GARMIN_PASSWORD?: string;
		NEXT_PUBLIC_DOMAIN: string;
		TURSO_DATABASE_URL: string;
		TURSO_AUTH_TOKEN: string;
	}
}
