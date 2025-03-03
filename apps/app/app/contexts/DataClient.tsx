import type { DataClient } from "@repo/types";
import { createContext, useContext, PropsWithChildren } from "react";

interface DataClientContextType {
  client: DataClient;
}

const DataClientContext = createContext<DataClientContextType | undefined>(
  undefined,
);

export const DataClientProvider = ({
  children,
  client,
}: PropsWithChildren<{
  client: DataClient;
}>) => {
  return (
    <DataClientContext.Provider value={{ client }}>
      {children}
    </DataClientContext.Provider>
  );
};

export const useDataClient = () => {
  const context = useContext(DataClientContext);
  if (context === undefined) {
    throw new Error("useDataClient must be used within a DataClientProvider");
  }
  return context;
};
