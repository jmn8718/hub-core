import "@repo/app/styles.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { WebClient } from "@repo/clients";
import { App } from "@repo/app";

const client = new WebClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App client={client} />
  </StrictMode>,
);
