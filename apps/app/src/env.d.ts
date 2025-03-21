/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_APP_TITLE: string;
	readonly MAIN_VITE_LOCAL_DB_FILE: string;
	// more env variables...
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
