import type { Client } from "@repo/clients";
import {
	type ActivitiesData,
	Channels,
	type GearsData,
	type IOverviewData,
	type ProviderSuccessResponse,
	type Providers,
	type StorageKeys,
	type Value,
} from "@repo/types";

export class AppClient implements Client {
	async getDataOverview({ limit }: { limit?: number }): Promise<
		ProviderSuccessResponse<{
			data: IOverviewData[];
		}>
	> {
		try {
			const data = await window.electron.ipcRenderer.invoke(
				Channels.DB_OVERVIEW,
				{
					limit,
				},
			);
			return {
				success: true,
				data,
			};
		} catch (err) {
			return {
				success: false,
				error: (err as Error).message,
			};
		}
	}

	async getActivities(params: {
		cursor?: string;
		limit?: number;
		offset?: number;
	}): Promise<
		ProviderSuccessResponse<{
			data: ActivitiesData;
		}>
	> {
		try {
			const data = (await window.electron.ipcRenderer.invoke(
				Channels.DB_ACTIVITIES,
				params,
			)) as Awaited<Promise<ActivitiesData>>;
			return {
				success: true,
				data,
			};
		} catch (err) {
			return {
				success: false,
				error: (err as Error).message,
			};
		}
	}

	async getGears(params: {
		cursor?: string;
		limit?: number;
		offset?: number;
	}): Promise<
		ProviderSuccessResponse<{
			data: GearsData;
		}>
	> {
		try {
			const data = (await window.electron.ipcRenderer.invoke(
				Channels.DB_GEAR,
				params,
			)) as Awaited<Promise<GearsData>>;
			return {
				success: true,
				data,
			};
		} catch (err) {
			return {
				success: false,
				error: (err as Error).message,
			};
		}
	}

	async getStoreValue<T = Value>(key: StorageKeys): Promise<T | undefined> {
		return window.electron.ipcRenderer
			.invoke(Channels.STORE_GET, { key })
			.then((data: T | undefined) => {
				console.log({ data });
				return data;
			});
	}

	async setStoreValue(key: StorageKeys, value: Value): Promise<undefined> {
		await window.electron.ipcRenderer.invoke(Channels.STORE_SET, {
			key,
			value,
		});
		localStorage.setItem(key, JSON.stringify({ value }));
	}

	async providerSync(provider: Providers): Promise<ProviderSuccessResponse> {
		try {
			await window.electron.ipcRenderer.invoke(Channels.PROVIDERS_SYNC, {
				provider,
			});
			return {
				success: true,
			};
		} catch (err) {
			return {
				success: false,
				error: (err as Error).message,
			};
		}
	}

	async getFolder(
		defaultPath: string,
		title: string,
	): Promise<ProviderSuccessResponse<{ data: string }>> {
		try {
			const selectedPath = await window.electron.ipcRenderer.invoke(
				Channels.FOLDER_GET,
				{
					defaultPath,
					title,
				},
			);
			return {
				success: true,
				data: selectedPath,
			};
		} catch (err) {
			return {
				success: false,
				error: (err as Error).message,
			};
		}
	}

	async signout(): Promise<undefined> {}

	getDebugInfo(): ProviderSuccessResponse<{ data: string[] }> {
		try {
			return {
				success: true,
				data: Object.entries(window.electron.process.versions)
					.filter(
						([key, value]) =>
							!!value && ["node", "electron", "chrome"].includes(key),
					)
					.map(([key, value]) => `${key}: ${value}`) as string[],
			};
		} catch (err) {
			return {
				success: false,
				error: (err as Error).message,
			};
		}
	}
}
