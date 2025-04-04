import { StorageKeys } from "@repo/types";
import type React from "react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";
import { useDataClient } from "./DataClientContext.js";

type StoreKeys =
	| StorageKeys.OBSIDIAN_DISABLED
	| StorageKeys.DOWNLOAD_FOLDER
	| StorageKeys.OBSIDIAN_FOLDER;
type Store = Record<StoreKeys, string>;
interface StoreContextType {
	store: Store;
	getValue: (key: StoreKeys) => Promise<string | undefined>;
	setValue: (key: StoreKeys, value: string) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const { client } = useDataClient();
	const [store, setStore] = useState<Store>({
		[StorageKeys.OBSIDIAN_DISABLED]: "",
		[StorageKeys.OBSIDIAN_FOLDER]: "",
		[StorageKeys.DOWNLOAD_FOLDER]: "",
	});

	const setValue = useCallback(
		async (key: StorageKeys, value: string, setOnClient = true) => {
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
		async (key: StoreKeys, isInitialGet = false) => {
			const storeValue = await client.getStoreValue<string>(key);
			if (storeValue) {
				setValue(key, storeValue, !isInitialGet);
			}
			return storeValue;
		},
		[client, setValue],
	);

	const getValue = async (key: StoreKeys) => {
		if (store[key]) return store[key];
		return getFromStore(key);
	};

	useEffect(() => {
		getFromStore(StorageKeys.DOWNLOAD_FOLDER, true);
		getFromStore(StorageKeys.OBSIDIAN_FOLDER, true);
		getFromStore(StorageKeys.OBSIDIAN_DISABLED, true);
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
