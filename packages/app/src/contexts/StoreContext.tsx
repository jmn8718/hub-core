import { StorageKeys, type Value } from "@repo/types";
import type React from "react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
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
		[StorageKeys.CACHE_FOLDER]: "",
		[StorageKeys.DEFAULT_CITY]: "",
		[StorageKeys.DEFAULT_COUNTRY]: "",
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

	// Read the latest store through a ref so getValue keeps its identity across
	// store updates; consumers list it in effect deps and must not re-run
	// (and reset their local form state) on every store write.
	const storeRef = useRef(store);
	storeRef.current = store;
	const getValue = useCallback(
		async <T = Value>(key: StorageKeys): Promise<T | undefined> => {
			const current = storeRef.current[key];
			if (current) return current as T;
			return getFromStore<T>(key);
		},
		[getFromStore],
	);

	useEffect(() => {
		getFromStore(StorageKeys.DOWNLOAD_FOLDER, true);
		getFromStore(StorageKeys.OBSIDIAN_FOLDER, true);
		getFromStore(StorageKeys.OBSIDIAN_DISABLED, true);
		getFromStore(StorageKeys.CACHE_FOLDER, true);
		getFromStore(StorageKeys.DEFAULT_CITY, true);
		getFromStore(StorageKeys.DEFAULT_COUNTRY, true);
	}, [getFromStore]);

	const contextValue = useMemo(
		() => ({ store, setValue, getValue }),
		[store, setValue, getValue],
	);

	return (
		<StoreContext.Provider value={contextValue}>
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
