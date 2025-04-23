import type {
	ActivitiesData,
	Credentials,
	DbActivityPopulated,
	GearsData,
	IOverviewData,
	ProviderSuccessResponse,
	Providers,
	StorageKeys,
	Value,
} from "@repo/types";

export abstract class Client {
	abstract getDataOverview(params: { limit?: number }): Promise<
		ProviderSuccessResponse<{
			data: IOverviewData[];
		}>
	>;

	abstract getActivities(params: {
		cursor?: string;
		limit?: number;
		offset?: number;
	}): Promise<
		ProviderSuccessResponse<{
			data: ActivitiesData;
		}>
	>;

	abstract getActivity(activityId: string): Promise<
		ProviderSuccessResponse<{
			data?: DbActivityPopulated;
		}>
	>;

	abstract getGears(params: {
		cursor?: string;
		limit?: number;
		offset?: number;
	}): Promise<
		ProviderSuccessResponse<{
			data: GearsData;
		}>
	>;

	abstract editActivity(
		id: string,
		data: {
			locationName?: string;
			locationCountry?: string;
			notes?: string;
			name?: string;
		},
	): Promise<ProviderSuccessResponse>;

	abstract getStoreValue<T = Value>(key: StorageKeys): Promise<T | undefined>;
	abstract setStoreValue(key: StorageKeys, value: Value): Promise<undefined>;

	abstract providerSyncGear(
		provider: Providers,
	): Promise<ProviderSuccessResponse>;
	abstract providerGearLink(
		activityId: string,
		gearId: string,
	): Promise<ProviderSuccessResponse>;
	abstract providerGearUnlink(
		activityId: string,
		gearId: string,
	): Promise<ProviderSuccessResponse>;

	abstract providerSync(provider: Providers): Promise<ProviderSuccessResponse>;
	abstract providerConnect(
		provider: Providers,
		credentials: Credentials,
	): Promise<ProviderSuccessResponse>;

	abstract getFolder(
		defaultPath: string,
		title: string,
	): Promise<ProviderSuccessResponse<{ data: string }>>;

	abstract signout(): Promise<undefined>;

	abstract getDebugInfo(): ProviderSuccessResponse<{ data: string[] }>;
}
