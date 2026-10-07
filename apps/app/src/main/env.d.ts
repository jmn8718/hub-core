/// <reference types="electron-vite/node" />

interface ImportMetaEnv {
	/** Development-only override of the local database location (libsql URL). */
	readonly MAIN_VITE_LOCAL_DB_FILE?: string;
	/** Injected from package.json by electron.vite.config.ts. */
	readonly MAIN_VITE_APP_DISPLAY_NAME?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
