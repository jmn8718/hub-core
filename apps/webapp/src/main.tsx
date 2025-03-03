import "@repo/app/styles.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@repo/app";
import { WebClient } from "@/clients/web";

const client = new WebClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App client={client} />
  </StrictMode>,
);
