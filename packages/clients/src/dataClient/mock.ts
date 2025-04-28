import type {
	ActivitiesData,
	Credentials,
	DbActivityPopulated,
	GearsData,
	IDbGearWithDistance,
	IOverviewData,
	ProviderSuccessResponse,
	Providers,
	StorageKeys,
	Value,
} from "@repo/types";
import type { Client } from "./Client.js";

export class MockClient implements Client {
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

	async getActivities(_params: {
		cursor?: string;
		limit?: number;
		offset?: number;
	}): Promise<
		ProviderSuccessResponse<{
			data: ActivitiesData;
		}>
	> {
		return {
			success: true,
			data: {
				count: 0,
				cursor: "",
				data: [],
			},
		};
	}

	async getActivity(activityId: string): Promise<
		ProviderSuccessResponse<{
			data?: DbActivityPopulated;
		}>
	> {
		return {
			success: true,
			data: undefined,
		};
	}

	async editActivity(
		id: string,
		data: {
			locationName?: string;
			locationCountry?: string;
			notes?: string;
			name?: string;
		},
	): Promise<ProviderSuccessResponse> {
		try {
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

	async getGears(_params: {
		cursor?: string;
		limit?: number;
		offset?: number;
	}): Promise<
		ProviderSuccessResponse<{
			data: GearsData;
		}>
	> {
		return {
			success: true,
			data: { data: [], count: 0, cursor: "" },
		};
	}

	async getGear(gearId: string): Promise<
		ProviderSuccessResponse<{
			data?: IDbGearWithDistance;
		}>
	> {
		try {
			return {
				success: true,
				data: undefined,
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
		const value = localStorage.getItem(key);
		return value ? (JSON.parse(value) as { value: T }).value : undefined;
	}

	async setStoreValue(key: StorageKeys, value: Value): Promise<undefined> {
		localStorage.setItem(key, JSON.stringify({ value }));
	}

	async providerSyncGear(): Promise<ProviderSuccessResponse> {
		return {
			success: true,
		};
	}

	async providerGearLink(
		activityId: string,
		gearId: string,
	): Promise<ProviderSuccessResponse> {
		return {
			success: true,
		};
	}

	async providerGearUnlink(
		activityId: string,
		gearId: string,
	): Promise<ProviderSuccessResponse> {
		return {
			success: true,
		};
	}

	async providerSync(): Promise<ProviderSuccessResponse> {
		return {
			success: true,
		};
	}

	async providerConnect(
		provider: Providers,
		credentials: Credentials,
	): Promise<ProviderSuccessResponse> {
		return {
			success: true,
		};
	}
	// on the web, this can not be implemented
	async getFolder(): Promise<ProviderSuccessResponse<{ data: string }>> {
		return {
			success: true,
			data: "",
		};
	}

	async signout(): Promise<undefined> {}
	getDebugInfo(): ProviderSuccessResponse<{ data: string[] }> {
		return {
			success: true,
			data: [],
		};
	}

	async openLink(): Promise<undefined> {}
	existsFile(params: {
		provider: Providers;
		activityId: string;
	}): Promise<ProviderSuccessResponse<{ data: { exists: boolean } }>> {
		return Promise.resolve({ success: true, data: { exists: false } });
	}
}
