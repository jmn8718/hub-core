import "./styles.css";
import "@repo/ui/styles.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { WebClient } from "@repo/clients";
import { App } from "./app.js";
import { AppType } from "@repo/types";

const client = new WebClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App client={client} type={AppType.WEB} />
  </StrictMode>,
);
