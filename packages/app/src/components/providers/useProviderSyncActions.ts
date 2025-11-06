import type { Client } from "@repo/clients";
import { type Providers, StorageKeys } from "@repo/types";
import { useCallback } from "react";
import { Bounce, toast } from "react-toastify";

export type ValidationStatus = "pending" | "validating" | "success" | "error";

const getLastSyncKey = (provider: Providers): StorageKeys => {
	const key = `${provider}_LAST_SYNC` as keyof typeof StorageKeys;
	return StorageKeys[key];
};

export function useProviderSyncActions({
	provider,
	validationStatus,
	client,
	setLocalLoading,
	setValue,
}: {
	provider: Providers;
	validationStatus: ValidationStatus;
	client: Client;
	setLocalLoading: (value: boolean) => void;
	setValue: (key: StorageKeys, value: string) => void | Promise<void>;
}) {
	const handlePullGear = useCallback(async () => {
		if (validationStatus !== "success") return;
		setLocalLoading(true);

		try {
			const result = await client.providerSyncGear(provider);
			if (result.success) {
				toast.success("Gear synced", { transition: Bounce });
			} else {
				throw new Error(result.error);
			}
		} catch (error) {
			toast.error((error as Error).message, {
				hideProgressBar: false,
				closeOnClick: false,
				transition: Bounce,
			});
		}

		setTimeout(() => {
			setLocalLoading(false);
		}, 200);
	}, [client, provider, setLocalLoading, validationStatus]);

	const handleSync = useCallback(async () => {
		if (validationStatus !== "success") return;
		setLocalLoading(true);

		try {
			const result = await client.providerSync(provider, true);
			if (result.success) {
				toast.success("Activities synced", { transition: Bounce });
				setValue(getLastSyncKey(provider), new Date().toISOString());
			} else {
				throw new Error(result.error);
			}
		} catch (error) {
			toast.error((error as Error).message, {
				hideProgressBar: false,
				closeOnClick: false,
				transition: Bounce,
			});
		}

		setTimeout(() => {
			setLocalLoading(false);
		}, 200);
	}, [client, provider, setLocalLoading, setValue, validationStatus]);

	return { handlePullGear, handleSync };
}
