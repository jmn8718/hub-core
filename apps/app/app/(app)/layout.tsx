"use client";

import { DataClientProvider } from "../contexts/DataClient";
import { WebClient } from "@repo/clients";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const client = new WebClient();

  return <DataClientProvider client={client}>{children}</DataClientProvider>;
}
