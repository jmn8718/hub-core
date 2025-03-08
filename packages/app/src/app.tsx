import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import type { AppType } from "@repo/types";
import { Client } from "@repo/clients";

import { BottomStatus, Layout } from "./components/index.js";
import { Routes as AppRoutes } from "./constants.js";
import * as Pages from "./pages/index.js";
import {
  DataClientProvider,
  LoadingProvider,
  StoreProvider,
  ThemeProvider,
} from "./contexts/index.js";

export function App({ client, type }: { client: Client; type: AppType }) {
  if (!client) {
    throw new Error("Provide valid client");
  }
  return (
    <DataClientProvider client={client} type={type}>
      <ThemeProvider>
        <StoreProvider>
          <LoadingProvider>
            <Router>
              <Layout>
                <Routes>
                  <Route path={AppRoutes.HOME} element={<Pages.HomePage />} />
                  <Route
                    path={AppRoutes.SETTINGS}
                    element={<Pages.SettingsPage />}
                  />
                  <Route
                    path={AppRoutes.DATA}
                    element={<Pages.DataListPage />}
                  />
                  {/* <Route path={AppRoutes.PROVIDERS} element={<ProvidersPage />} />
                  <Route
                    path={`${AppRoutes.DETAILS}/:activityId`}
                    element={<DetailsPage />}
                  />
                  <Route path={AppRoutes.TABLE} element={<TablePage />} />
                  <Route path={AppRoutes.GEAR} element={<GearPage />} />
                  <Route path={AppRoutes.ADD} element={<AddActivityPage />} /> */}
                </Routes>
                <BottomStatus />
              </Layout>
            </Router>
          </LoadingProvider>
        </StoreProvider>
      </ThemeProvider>
    </DataClientProvider>
  );
}
