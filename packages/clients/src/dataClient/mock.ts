import type {
	ActivitiesData,
	ActivitySubType,
	ActivityType,
	ConnectCredentials,
	DbActivityPopulated,
	GearsData,
	IActivityCreateInput,
	IDailyOverviewData,
	IDbGearWithDistance,
	IGearCreateInput,
	IInbodyCreateInput,
	IInbodyData,
	IInbodyUpdateInput,
	IOverviewData,
	IWeeklyOverviewData,
	InbodyType,
	ProviderSuccessResponse,
	Providers,
	StorageKeys,
	StravaClientOptions,
	Value,
} from "@repo/types";
import type { Client } from "./Client.js";

export class MockClient implements Client {
	private gears: IDbGearWithDistance[] = [];

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

	async getWeeklyOverview({ limit: _limit }: { limit?: number }): Promise<
		ProviderSuccessResponse<{
			data: IWeeklyOverviewData[];
		}>
	> {
		return {
			success: true,
			data: [
				{ distance: 5000, duration: 3600, weekStart: "2024-12-02" },
				{ distance: 6200, duration: 4200, weekStart: "2024-11-25" },
				{ distance: 4500, duration: 3300, weekStart: "2024-11-18" },
				{ distance: 7000, duration: 5100, weekStart: "2024-11-11" },
			],
		};
	}

	async getDailyOverview({
		startDate: _startDate,
		endDate: _endDate,
		periodType: _periodType,
		periodCount: _periodCount,
	}: {
		startDate?: string;
		endDate?: string;
		periodType?: "days" | "weeks" | "months";
		periodCount?: number;
	}): Promise<
		ProviderSuccessResponse<{
			data: IDailyOverviewData[];
		}>
	> {
		return {
			success: true,
			data: [
				{ date: "2024-12-09", distance: 8000, duration: 3600, count: 1 },
				{ date: "2024-12-10", distance: 12000, duration: 5400, count: 2 },
				{ date: "2024-12-12", distance: 0, duration: 0, count: 0 },
			],
		};
	}

	async getActivities(_params: {
		cursor?: string;
		limit?: number;
		offset?: number;
		type?: ActivityType;
		subtype?: ActivitySubType;
		startDate?: string;
		endDate?: string;
		search?: string;
		isEvent?: 0 | 1;
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

	async createActivity(
		_data: IActivityCreateInput,
	): Promise<ProviderSuccessResponse<{ id: string }>> {
		return {
			success: true,
			id: crypto.randomUUID(),
		};
	}

	async editActivity(
		id: string,
		data: {
			locationName?: string;
			locationCountry?: string;
			notes?: string;
			name?: string;
			type?: ActivityType;
			subtype?: ActivitySubType;
			isEvent?: 0 | 1;
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
		const { cursor, limit = 20, offset = 0 } = _params ?? {};
		let startIndex = offset;
		if (cursor) {
			const cursorIndex = this.gears.findIndex((gear) => gear.id === cursor);
			startIndex = cursorIndex >= 0 ? cursorIndex + 1 : offset;
		}
		const data = this.gears.slice(startIndex, startIndex + limit);
		const nextCursor =
			data.length + startIndex < this.gears.length
				? data[data.length - 1]?.id || ""
				: "";
		return {
			success: true,
			data: {
				data,
				count: this.gears.length,
				cursor: nextCursor,
			},
		};
	}

	async getGear(gearId: string): Promise<
		ProviderSuccessResponse<{
			data?: IDbGearWithDistance;
		}>
	> {
		try {
			const gear = this.gears.find((item) => item.id === gearId);
			return {
				success: true,
				data: gear,
			};
		} catch (err) {
			return {
				success: false,
				error: (err as Error).message,
			};
		}
	}

	async createGear(
		data: IGearCreateInput,
	): Promise<ProviderSuccessResponse<{ id: string }>> {
		const id = crypto.randomUUID();
		const newGear: IDbGearWithDistance = {
			id,
			name: data.name,
			code: data.code,
			brand: data.brand ?? "",
			type: data.type,
			dateBegin: data.dateBegin,
			dateEnd: undefined,
			maximumDistance: data.maximumDistance ?? 0,
			distance: 0,
			providerConnections: [],
		};
		this.gears = [newGear, ...this.gears];
		return {
			success: true,
			id,
		};
	}

	async deleteActivity(_activityId: string): Promise<ProviderSuccessResponse> {
		return { success: true };
	}

	async linkActivityConnection(
		_activityId: string,
		_providerActivityId: string,
	): Promise<ProviderSuccessResponse> {
		return { success: true };
	}

	async unlinkActivityConnection(
		_activityId: string,
		_providerActivityId: string,
	): Promise<ProviderSuccessResponse> {
		return { success: true };
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
			this.gears = this.gears.map((gear) =>
				gear.id === id
					? {
							...gear,
							...data,
							maximumDistance:
								data.maximumDistance !== undefined
									? Number(data.maximumDistance)
									: gear.maximumDistance,
						}
					: gear,
			);
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

	async providerGearCreate(
		provider: Providers,
		gearId: string,
	): Promise<ProviderSuccessResponse> {
		const providerId = crypto.randomUUID();
		this.gears = this.gears.map((gear) =>
			gear.id === gearId
				? {
						...gear,
						providerConnections: [
							...(gear.providerConnections ?? []),
							{ provider, providerId },
						],
					}
				: gear,
		);
		return { success: true };
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
		credentials: ConnectCredentials,
		options?: StravaClientOptions,
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

	async uploadActivityFile(params: {
		provider: Providers;
		providerActivityId: string;
		target: Providers;
		downloadPath: string;
	}): Promise<ProviderSuccessResponse> {
		return {
			success: true,
		};
	}

	async downloadActivityFile(params: {
		provider: Providers;
		providerActivityId: string;
		downloadPath: string;
	}): Promise<ProviderSuccessResponse> {
		return {
			success: true,
		};
	}

	async exportActivityManual(params: {
		target: Providers;
		activityId: string;
	}): Promise<ProviderSuccessResponse> {
		return {
			success: true,
		};
	}

	async exportActivityObsidian(params: {
		folderPath: string;
		fileName: string;
		content: string;
		fileFormat: string;
	}): Promise<ProviderSuccessResponse> {
		return {
			success: true,
		};
	}

	public async getInbodyData(params: {
		type: InbodyType;
	}): Promise<ProviderSuccessResponse<{ data: IInbodyData[] }>> {
		return {
			success: true,
			data: [],
		};
	}

	public async createInbodyData(
		data: IInbodyCreateInput,
	): Promise<ProviderSuccessResponse> {
		return {
			success: true,
		};
	}

	public async updateInbodyData(
		data: IInbodyUpdateInput,
	): Promise<ProviderSuccessResponse> {
		return {
			success: true,
		};
	}
}
