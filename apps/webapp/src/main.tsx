import "@repo/app/styles.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@repo/app";
import { WebClient } from "@/clients/web";
import { AppType } from "@repo/types";

const client = new WebClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App client={client} type={AppType.WEB} />
  </StrictMode>,
);
