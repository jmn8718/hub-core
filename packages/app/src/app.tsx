import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import type { DataClient } from "@repo/types";

import { Layout } from "./components/Layout.js";
import { DashboardPage } from "./pages/DashboardPage.js";
import { StickyNotification } from "./components/StickyNotification.js";
import { ThemeProvider } from "./contexts/ThemeContext.js";
import { LoadingProvider } from "./contexts/LoadingContext.js";

import { Routes as AppRoutes } from "./constants.js";

import { DataClientProvider } from "./contexts/DataClientContext.js";

export function App({ client }: { client: DataClient }) {
  if (!client) {
    throw new Error("Provide valid client");
  }
  return (
    <ThemeProvider>
      <LoadingProvider>
        <DataClientProvider client={client}>
          <Router>
            <Layout>
              <Routes>
                <Route path={AppRoutes.HOME} element={<DashboardPage />} />
              </Routes>
              <StickyNotification />
            </Layout>
          </Router>
        </DataClientProvider>
      </LoadingProvider>
    </ThemeProvider>
  );
}
