import type {
	ActivitiesData,
	GearsData,
	IOverviewData,
	ProviderSuccessResponse,
	Providers,
} from "@repo/types";

export abstract class Client {
	abstract getDataOverview(params: { limit?: number }): Promise<
		ProviderSuccessResponse<{
			data: IOverviewData[];
		}>
	>;

	abstract getActivities(params: { limit?: number; cursor?: string }): Promise<
		ProviderSuccessResponse<{
			data: ActivitiesData;
		}>
	>;

	abstract getGears(params: { skip?: number; size?: number }): Promise<
		ProviderSuccessResponse<{
			data: GearsData;
		}>
	>;

	abstract getStoreValue<T = string>(key: string): Promise<T | undefined>;
	abstract setStoreValue(
		key: string,
		value: string | boolean | number,
	): Promise<undefined>;

	abstract providerSync(
		providerId: Providers,
		force?: boolean,
	): Promise<ProviderSuccessResponse>;

	abstract getFolder(
		defaultPath: string,
		title: string,
	): Promise<ProviderSuccessResponse<{ data: string }>>;

	abstract signout(): Promise<undefined>;

	abstract getDebugInfo(): ProviderSuccessResponse<{ data: string[] }>;
}
