import type React from "react";
import { createContext, useContext, useState } from "react";

interface StravaContextType {
	token: string;
	setToken: (token: string) => void;
}

const StravaContext = createContext<StravaContextType | undefined>(undefined);

export const StravaProvider: React.FC<{
	children: React.ReactNode;
	initialToken: string;
}> = ({ children, initialToken }) => {
	const [token, setToken] = useState(initialToken);

	return (
		<StravaContext.Provider value={{ token, setToken }}>
			{children}
		</StravaContext.Provider>
	);
};

export const useStrava = () => {
	const context = useContext(StravaContext);
	if (context === undefined) {
		throw new Error("useStrava must be used within a StravaProvider");
	}
	return context;
};
