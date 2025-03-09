import "@repo/ui/styles.css";
import "@repo/app/styles.css";

import { App } from "@repo/app";
import { AppType } from "@repo/types";
import React from "react";
import ReactDOM from "react-dom/client";
import { AppClient } from "./libs/client.js";

const client = new AppClient();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
	<React.StrictMode>
		<App client={client} type={AppType.DESKTOP} />
	</React.StrictMode>,
);
