import "@repo/ui/styles.css";
import "@repo/app/styles.css";

import { App } from "@repo/app";
import { AppType } from "@repo/types";
import React from "react";
import ReactDOM from "react-dom/client";
import { AppClient } from "./libs/client.js";

const client = new AppClient();
Object.assign(globalThis, {
	__HUB_BUILD_INFO__: {
		appVersion: import.meta.env.VITE_HUB_APP_VERSION || "unknown",
		clientVersion: import.meta.env.VITE_HUB_CLIENT_VERSION || "unknown",
		commit: import.meta.env.VITE_HUB_COMMIT || "unknown",
	},
});

// use React.Fragment instead of React.StrictMode to avoid initial re-rendering
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
	<React.Fragment>
		<App client={client} type={AppType.DESKTOP} />
	</React.Fragment>,
);
