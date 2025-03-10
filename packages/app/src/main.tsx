import "./styles.css";
import "@repo/ui/styles.css";

import { MockClient } from "@repo/clients";
import { AppType } from "@repo/types";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app.js";

const client = new MockClient();

// biome-ignore lint/style/noNonNullAssertion: <explanation>
createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<App client={client} type={AppType.WEB} />
	</StrictMode>,
);
