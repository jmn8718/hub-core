import React, { createContext, useContext, useEffect, useState } from "react";
import { STORE_KEYS } from "../constants.js";
import { useDataClient } from "./DataClientContext.js";

interface StoreContextType {
  store: Record<string, string>;
  getValue: (key: string) => Promise<string | undefined>;
  setValue: (key: string, value: string) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

// eslint-disable-next-line react/function-component-definition
export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { client } = useDataClient();
  const [store, setStore] = useState<
    Record<string, string> & {
      obsidian_disabled: string;
    }
  >({
    obsidian_disabled: "",
  });

  const setValue = async (key: string, value: string, setOnClient = true) => {
    if (setOnClient) {
      await client.setStoreValue(key, value);
    }
    setStore((currentStore) => ({
      ...currentStore,
      [key]: value,
    }));
  };

  const getFromStore = async (key: string, isInitialGet = false) => {
    const storeValue = await client.getStoreValue(key);
    if (storeValue) {
      setValue(key, storeValue, !isInitialGet);
    }
    return storeValue;
  };

  const getValue = async (key: string) => {
    if (store[key]) return store[key];
    return getFromStore(key);
  };

  useEffect(() => {
    getFromStore(STORE_KEYS.DOWNLOAD_FOLDER, true);
    getFromStore(STORE_KEYS.OBSIDIAN_FOLDER, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
