import { StorageKeys, type Value } from "@repo/types";
import type React from "react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";
import { useDataClient } from "./DataClientContext.js";

type Store = Record<string, Value | undefined>;
interface StoreContextType {
	store: Store;
	getValue: <T = Value>(key: StorageKeys) => Promise<T | undefined>;
	setValue: (key: StorageKeys, value: Value) => void;
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
		async (key: StorageKeys, value: Value, setOnClient = true) => {
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
		async <T = Value>(
			key: StorageKeys,
			isInitialGet = false,
		): Promise<T | undefined> => {
			const storeValue = await client.getStoreValue<T>(key);
			if (storeValue) {
				setValue(key, storeValue, !isInitialGet);
			}
			return storeValue;
		},
		[client, setValue],
	);

	const getValue = async <T = Value>(
		key: StorageKeys,
	): Promise<T | undefined> => {
		if (store[key]) return store[key] as T;
		return getFromStore<T>(key);
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
