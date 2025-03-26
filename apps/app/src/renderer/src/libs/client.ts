import type { Client } from "@repo/clients";
import {
	type ActivitiesData,
	Channels,
	type GearsData,
	type IOverviewData,
	type ProviderSuccessResponse,
	type Providers,
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

	async getActivities(params: { limit?: number; cursor?: string }): Promise<
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

	async getGears(params: { limit?: number; size?: number }): Promise<
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

	async getStoreValue<T = string>(key: string): Promise<T | undefined> {
		const value = localStorage.getItem(key);
		return value ? (JSON.parse(value) as { value: T }).value : undefined;
	}

	async setStoreValue(
		key: string,
		value: string | boolean | number,
	): Promise<undefined> {
		localStorage.setItem(key, JSON.stringify({ value }));
	}

	async providerSync(
		_providerId: Providers,
		_force?: boolean,
	): Promise<ProviderSuccessResponse> {
		return {
			success: true,
		};
	}

	async getFolder(
		defaultPath: string,
		title: string,
	): Promise<ProviderSuccessResponse<{ data: string }>> {
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
