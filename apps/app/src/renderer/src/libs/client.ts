import type { Client } from "@repo/clients";
import {
	type ActivitiesData,
	Channels,
	type IDbGear,
	type IOverviewData,
	type ProviderSuccessResponse,
	type Providers,
} from "@repo/types";

export class AppClient implements Client {
	async getDataOverview({ limit: _limit }: { limit?: number }): Promise<
		ProviderSuccessResponse<{
			data: IOverviewData[];
		}>
	> {
		return {
			success: true,
			data: [
				{ distance: 800, count: 3, month: "2024-09" },
				{ distance: 900, count: 3, month: "2024-10" },
				{ distance: 1000, count: 3, month: "2024-11" },
				{ distance: 1500, count: 5, month: "2024-12" },
				{ distance: 1200, count: 3, month: "2025-01" },
			],
		};
	}

	async getActivities(_params: { limit?: number; size?: number }): Promise<
		ProviderSuccessResponse<{
			data: ActivitiesData;
		}>
	> {
		// const activities = await window.electron.ipcRenderer.invoke(
		//   Channels.DB_ACTIVITIES,
		//   params,
		// )
		return {
			success: true,
			data: {
				data: [],
				count: 0,
				cursor: "",
			},
		};
	}

	async getGears(_params: { limit?: number; size?: number }): Promise<
		ProviderSuccessResponse<{
			data: IDbGear[];
		}>
	> {
		// const activities = await window.electron.ipcRenderer.invoke(
		//   Channels.DB_ACTIVITIES,
		//   params,
		// )
		return {
			success: true,
			data: [],
		};
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
}
