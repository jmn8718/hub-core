import type React from "react";
import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useState,
} from "react";

interface LoadingContextType {
	isGlobalLoading: boolean;
	setGlobalLoading: (loading: boolean, message?: string) => void;
	isLocalLoading: boolean;
	setLocalLoading: (loading: boolean) => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const LoadingProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const [isGlobalLoading, setGlobalLoading] = useState(false);
	// Several handlers toggle the local flag concurrently; count the active
	// ones so an early "false" from one cannot hide another's spinner.
	const [localLoadingCount, setLocalLoadingCount] = useState(0);
	const isLocalLoading = localLoadingCount > 0;
	const setLocalLoading = useCallback((loading: boolean) => {
		setLocalLoadingCount((count) =>
			loading ? count + 1 : Math.max(0, count - 1),
		);
	}, []);
	const [globalLoadingMessage, setGlobalLoadingMessage] = useState("Loading");

	const updateGlobalLoading = useCallback(
		(loading: boolean, message = "Loading") => {
			setGlobalLoading(loading);
			if (loading) {
				setGlobalLoadingMessage(message);
			}
		},
		[],
	);

	const contextValue = useMemo(
		() => ({
			isGlobalLoading,
			setGlobalLoading: updateGlobalLoading,
			isLocalLoading,
			setLocalLoading,
		}),
		[isGlobalLoading, isLocalLoading, setLocalLoading, updateGlobalLoading],
	);

	return (
		<LoadingContext.Provider value={contextValue}>
			{children}
			{isGlobalLoading && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45"
					role="presentation"
				>
					<div
						className="flex flex-col items-center rounded-lg border border-slate-200 bg-white p-6 text-slate-900 shadow-xl dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
						// biome-ignore lint/a11y/useSemanticElements: <explanation>
						role="status"
						aria-live="polite"
						aria-busy="true"
					>
						<div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
						<p>{globalLoadingMessage}...</p>
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
