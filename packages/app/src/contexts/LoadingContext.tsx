import type React from "react";
import { createContext, useContext, useState } from "react";

interface LoadingContextType {
	isGlobalLoading: boolean;
	setGlobalLoading: (loading: boolean) => void;
	isLocalLoading: boolean;
	setLocalLoading: (loading: boolean) => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const LoadingProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const [isGlobalLoading, setGlobalLoading] = useState(false);
	const [isLocalLoading, setLocalLoading] = useState(false);

	return (
		<LoadingContext.Provider
			value={{
				isGlobalLoading,
				setGlobalLoading,
				isLocalLoading,
				setLocalLoading,
			}}
		>
			{children}
			{isGlobalLoading && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white dark:bg-gray-800 rounded-lg p-6 flex flex-col items-center">
						<div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
						<p className="text-gray-700 dark:text-gray-300">Loading...</p>
					</div>
				</div>
			)}
		</LoadingContext.Provider>
	);
};

export const useLoading = () => {
	const context = useContext(LoadingContext);
	if (context === undefined) {
		throw new Error("useLoading must be used within a LoadingProvider");
	}
	return context;
};
