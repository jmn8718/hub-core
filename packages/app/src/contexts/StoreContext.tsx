import type React from "react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";
import { STORE_KEYS } from "../constants.js";
import { useDataClient } from "./DataClientContext.js";

type StoreKeys = Record<string, string>;
interface StoreContextType {
	store: StoreKeys;
	getValue: (key: string) => Promise<string | undefined>;
	setValue: (key: string, value: string) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const { client } = useDataClient();
	const [store, setStore] = useState<StoreKeys>({
		[STORE_KEYS.OBSIDIAN_DISABLED]: "",
		[STORE_KEYS.OBSIDIAN_FOLDER]: "",
		[STORE_KEYS.DOWNLOAD_FOLDER]: "",
	});

	const setValue = useCallback(
		async (key: string, value: string, setOnClient = true) => {
			if (setOnClient) {
				await client.setStoreValue(key, value);
			}
			setStore((currentStore) => ({
				...currentStore,
				[key]: value,
			}));
		},
		[client],
	);

	const getFromStore = useCallback(
		async (key: string, isInitialGet = false) => {
			const storeValue = await client.getStoreValue(key);
			if (storeValue) {
				setValue(key, storeValue, !isInitialGet);
			}
			return storeValue;
		},
		[client, setValue],
	);

	const getValue = async (key: string) => {
		if (store[key]) return store[key];
		return getFromStore(key);
	};

	useEffect(() => {
		getFromStore(STORE_KEYS.DOWNLOAD_FOLDER, true);
		getFromStore(STORE_KEYS.OBSIDIAN_FOLDER, true);
		getFromStore(STORE_KEYS.OBSIDIAN_DISABLED, true);
	}, [getFromStore]);

	return (
		<StoreContext.Provider
			value={{
				store,
				setValue,
				getValue,
			}}
		>
			{children}
		</StoreContext.Provider>
	);
};

export const useStore = () => {
	const context = useContext(StoreContext);
	if (context === undefined) {
		throw new Error("useStore must be used within a StoreProvider");
	}
	return context;
};
