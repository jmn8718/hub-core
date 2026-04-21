import "@repo/ui/styles.css";
import "@repo/app/styles.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./app.js";
import { supabase } from "./libs/supabase.js";
import { registerServiceWorker } from "./registerServiceWorker.js";

const MIN_SPLASH_DURATION_MS = 1000;

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

async function bootstrap() {
	const [{ data }] = await Promise.all([
		supabase.auth.getSession().catch(() => ({ data: { session: null } })),
		waitForMinimumSplashDuration(),
	]);

	// biome-ignore lint/style/noNonNullAssertion: <explanation>
	createRoot(document.getElementById("root")!).render(
		<StrictMode>
			<App initialSession={data.session} />
		</StrictMode>,
	);
}

void bootstrap();

registerServiceWorker();
