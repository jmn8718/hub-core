import "@repo/ui/styles.css";
import "@repo/app/styles.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./app.js";

Object.assign(globalThis, {
	__HUB_BUILD_INFO__: {
		appVersion: import.meta.env.VITE_HUB_APP_VERSION || "unknown",
		clientVersion: import.meta.env.VITE_HUB_CLIENT_VERSION || "unknown",
		commit: import.meta.env.VITE_HUB_COMMIT || "unknown",
	},
});

// biome-ignore lint/style/noNonNullAssertion: <explanation>
createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<App />
	</StrictMode>,
);
