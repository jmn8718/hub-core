import type { Client } from "@repo/clients";
import {
	type ActivitiesData,
	Channels,
	type Credentials,
	type DbActivityPopulated,
	type GearsData,
	type IDbGearWithDistance,
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

	async getActivity(activityId: string): Promise<
		ProviderSuccessResponse<{
			data?: DbActivityPopulated;
		}>
	> {
		try {
			const data = (await window.electron.ipcRenderer.invoke(
				Channels.DB_ACTIVITY,
				activityId,
			)) as Awaited<Promise<DbActivityPopulated | undefined>>;
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

	async editActivity(
		id: string,
		data: {
			locationName?: string;
			locationCountry?: string;
			name?: string;
			notes?: string;
		},
	): Promise<ProviderSuccessResponse> {
		try {
			await window.electron.ipcRenderer.invoke(Channels.DB_ACTIVITY_EDIT, {
				activityId: id,
				data,
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
				Channels.DB_GEARS,
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

	async getGear(gearId: string): Promise<
		ProviderSuccessResponse<{
			data?: IDbGearWithDistance;
		}>
	> {
		try {
			const data = (await window.electron.ipcRenderer.invoke(
				Channels.DB_GEAR,
				gearId,
			)) as Awaited<Promise<IDbGearWithDistance | undefined>>;
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

	async editGear(
		id: string,
		data: {
			dateEnd?: string;
			code?: string;
			name?: string;
			maximumDistance?: string;
		},
	): Promise<ProviderSuccessResponse> {
		try {
			await window.electron.ipcRenderer.invoke(Channels.DB_GEAR_EDIT, {
				gearId: id,
				data,
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

	async getStoreValue<T = Value>(key: StorageKeys): Promise<T | undefined> {
		return window.electron.ipcRenderer
			.invoke(Channels.STORE_GET, { key })
			.then((data: T | undefined) => data);
	}

	async setStoreValue(key: StorageKeys, value: Value): Promise<undefined> {
		await window.electron.ipcRenderer.invoke(Channels.STORE_SET, {
			key,
			value,
		});
		localStorage.setItem(key, JSON.stringify({ value }));
	}

	async providerSyncGear(
		provider: Providers,
	): Promise<ProviderSuccessResponse> {
		try {
			await window.electron.ipcRenderer.invoke(Channels.PROVIDERS_SYNC_GEAR, {
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

	async providerGearLink(
		activityId: string,
		gearId: string,
	): Promise<ProviderSuccessResponse> {
		try {
			await window.electron.ipcRenderer.invoke(Channels.PROVIDERS_GEAR_LINK, {
				activityId,
				gearId,
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

	async providerGearUnlink(
		activityId: string,
		gearId: string,
	): Promise<ProviderSuccessResponse> {
		try {
			await window.electron.ipcRenderer.invoke(Channels.PROVIDERS_GEAR_UNLINK, {
				activityId,
				gearId,
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

	async providerSync(
		provider: Providers,
		force = false,
	): Promise<ProviderSuccessResponse> {
		try {
			await window.electron.ipcRenderer.invoke(Channels.PROVIDERS_SYNC, {
				provider,
				force,
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

	async providerConnect(
		provider: Providers,
		credentials: Credentials,
	): Promise<ProviderSuccessResponse> {
		try {
			await window.electron.ipcRenderer.invoke(Channels.PROVIDERS_CONNECT, {
				provider,
				credentials,
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

	openLink(url: string): Promise<undefined> {
		return window.electron.ipcRenderer.invoke(Channels.OPEN_LINK, url);
	}

	async existsFile(params: {
		provider: Providers;
		activityId: string;
	}): Promise<ProviderSuccessResponse<{ data: { exists: boolean } }>> {
		try {
			const exists = await window.electron.ipcRenderer.invoke(
				Channels.FILE_EXISTS,
				params,
			);
			return {
				success: true,
				data: { exists },
			};
		} catch (err) {
			return {
				success: false,
				error: (err as Error).message,
			};
		}
	}
}
