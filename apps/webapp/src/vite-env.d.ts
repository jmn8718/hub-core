/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_APP_TITLE: string;
	readonly VITE_SUPABASE_URL: string;
	readonly VITE_SUPABASE_ANON_KEY: string;
	readonly VITE_API_URL: string;
	readonly VITE_HUB_APP_VERSION: string;
	readonly VITE_HUB_CLIENT_VERSION: string;
	readonly VITE_HUB_COMMIT: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
