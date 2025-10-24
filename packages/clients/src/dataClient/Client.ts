import type {
	ActivitiesData,
	Credentials,
	DbActivityPopulated,
	GearsData,
	IDbGearWithDistance,
	IInbodyData,
	IOverviewData,
	InbodyType,
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

	abstract getInbodyData(params: {
		type: InbodyType;
	}): Promise<ProviderSuccessResponse<{ data: IInbodyData[] }>>;

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

	abstract editActivity(
		id: string,
		data: {
			locationName?: string;
			locationCountry?: string;
			notes?: string;
			name?: string;
		},
	): Promise<ProviderSuccessResponse>;

	abstract getGears(params: {
		cursor?: string;
		limit?: number;
		offset?: number;
	}): Promise<
		ProviderSuccessResponse<{
			data: GearsData;
		}>
	>;

	abstract getGear(activityId: string): Promise<
		ProviderSuccessResponse<{
			data?: IDbGearWithDistance;
		}>
	>;

	abstract editGear(
		id: string,
		data: {
			dateEnd?: string;
			code?: string;
			name?: string;
			maximumDistance?: string;
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

	abstract providerSync(
		provider: Providers,
		force?: boolean,
	): Promise<ProviderSuccessResponse>;
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

	abstract openLink(url: string): Promise<void>;
	abstract existsFile(params: {
		provider: Providers;
		activityId: string;
	}): Promise<ProviderSuccessResponse<{ data: { exists: boolean } }>>;

	abstract uploadActivityFile(params: {
		provider: Providers;
		providerActivityId: string;
		target: Providers;
		downloadPath: string;
	}): Promise<ProviderSuccessResponse>;

	abstract downloadActivityFile(params: {
		provider: Providers;
		providerActivityId: string;
		downloadPath: string;
	}): Promise<ProviderSuccessResponse>;

	abstract exportActivityManual(params: {
		target: Providers;
		activityId: string;
	}): Promise<ProviderSuccessResponse>;

	abstract exportActivityObsidian(params: {
		folderPath: string;
		fileName: string;
		content: string;
		fileFormat: string;
	}): Promise<ProviderSuccessResponse>;
}
