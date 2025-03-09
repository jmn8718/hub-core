import type { Client } from "@repo/clients";
import type { AppType } from "@repo/types";
import { createContext, useContext } from "react";

interface DataClientContextType {
	client: Client;
	type: AppType;
}

const DataClientContext = createContext<DataClientContextType | undefined>(
	undefined,
);

export const DataClientProvider: React.FC<{
	client: Client;
	type: AppType;
	children: React.ReactNode;
}> = ({ children, client, type }) => {
	return (
		<DataClientContext.Provider value={{ client, type }}>
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
