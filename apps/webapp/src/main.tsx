import "@repo/ui/styles.css";
import "@repo/app/styles.css";

import {
	type SupabaseUserSession,
	WebOfflineCache,
	readPersistedSupabaseSession,
	resolveSupabaseSession,
} from "@repo/clients";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./app.js";
import { supabase } from "./libs/supabase.js";
import { registerServiceWorker } from "./registerServiceWorker.js";

const MIN_SPLASH_DURATION_MS = 1000;
const SESSION_BOOT_TIMEOUT_MS = 1500;

Object.assign(globalThis, {
	__HUB_BUILD_INFO__: {
		appVersion: import.meta.env.VITE_HUB_APP_VERSION || "unknown",
		clientVersion: import.meta.env.VITE_HUB_CLIENT_VERSION || "unknown",
		commit: import.meta.env.VITE_HUB_COMMIT || "unknown",
	},
});

const waitForMinimumSplashDuration = () =>
	new Promise((resolve) => {
		window.setTimeout(resolve, MIN_SPLASH_DURATION_MS);
	});

async function resolveBootSession(): Promise<SupabaseUserSession | null> {
	return resolveSupabaseSession({
		supabase,
		supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
		timeoutMs: SESSION_BOOT_TIMEOUT_MS,
	});
}

async function bootstrap() {
	const offlineCache = new WebOfflineCache();
	const [resolvedSession] = await Promise.all([
		resolveBootSession().catch(() => null),
		waitForMinimumSplashDuration(),
	]);

	let initialBootState: "ready" | "offline-no-cache" = "ready";
	let initialSession = resolvedSession;

	if (!initialSession) {
		initialSession = readPersistedSupabaseSession(
			import.meta.env.VITE_SUPABASE_URL,
		);
	}

	if (
		typeof navigator !== "undefined" &&
		navigator.onLine === false &&
		(!initialSession ||
			!(await offlineCache
				.hasUserData(initialSession.user.id)
				.catch(() => false)))
	) {
		initialBootState = "offline-no-cache";
		initialSession = null;
	}

	// biome-ignore lint/style/noNonNullAssertion: <explanation>
	createRoot(document.getElementById("root")!).render(
		<StrictMode>
			<App
				initialSession={initialSession}
				initialBootState={initialBootState}
			/>
		</StrictMode>,
	);
}

void bootstrap();

registerServiceWorker();
