import { Providers, StorageKeys } from "@repo/types";
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
	LoginCredentials,
	ProviderSuccessResponse,
	StravaClientOptions,
	StravaCredentials,
	Value,
} from "@repo/types";
import type { SupabaseClient } from "../supabase.js";
import type { Client } from "./Client.js";

interface WebClientConfig {
	apiBaseUrl: string;
	supabase: SupabaseClient;
}

type StoredProviderConfig = {
	credentials: ConnectCredentials;
	options?: StravaClientOptions;
};

export class WebClient implements Client {
	private readonly _supabase: SupabaseClient;
	private readonly _apiBaseUrl: string;

	constructor({ apiBaseUrl, supabase }: WebClientConfig) {
		this._supabase = supabase;
		this._apiBaseUrl = `${apiBaseUrl.replace(/\/$/, "")}/api/client`;
	}

	async getDataOverview({ limit }: { limit?: number }): Promise<
		ProviderSuccessResponse<{
			data: IOverviewData[];
		}>
	> {
		return this._execute<{ data: IOverviewData[] }>("getDataOverview", {
			limit,
		});
	}

	async getDailyOverview({
		startDate,
		endDate,
		periodType,
		periodCount,
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
		return this._execute<{ data: IDailyOverviewData[] }>("getDailyOverview", {
			startDate,
			endDate,
			periodType,
			periodCount,
		});
	}

	async getWeeklyOverview({ limit }: { limit?: number }): Promise<
		ProviderSuccessResponse<{
			data: IWeeklyOverviewData[];
		}>
	> {
		return this._execute<{ data: IWeeklyOverviewData[] }>("getWeeklyOverview", {
			limit,
		});
	}

	async getActivities(params: {
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
		return this._execute<{ data: ActivitiesData }>(
			"getActivities",
			params ?? {},
		);
	}

	async getActivity(activityId: string): Promise<
		ProviderSuccessResponse<{
			data?: DbActivityPopulated;
		}>
	> {
		return this._execute<{ data?: DbActivityPopulated }>("getActivity", {
			activityId,
		});
	}

	async createActivity(
		data: IActivityCreateInput,
	): Promise<ProviderSuccessResponse<{ id: string }>> {
		return this._execute<{ id: string }>("createActivity", { data });
	}

	async editActivity(
		id: string,
		data: {
			locationName?: string;
			notes?: string;
			locationCountry?: string;
			name?: string;
			type?: ActivityType;
			subtype?: ActivitySubType;
			isEvent?: 0 | 1;
		},
	): Promise<ProviderSuccessResponse> {
		return this._execute("editActivity", { id, data });
	}

	async deleteActivity(activityId: string): Promise<ProviderSuccessResponse> {
		return this._execute("deleteActivity", { activityId });
	}

	async linkActivityConnection(
		activityId: string,
		providerActivityId: string,
	): Promise<ProviderSuccessResponse> {
		return this._execute("linkActivityConnection", {
			activityId,
			providerActivityId,
		});
	}

	async unlinkActivityConnection(
		activityId: string,
		providerActivityId: string,
	): Promise<ProviderSuccessResponse> {
		return this._execute("unlinkActivityConnection", {
			activityId,
			providerActivityId,
		});
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
		return this._execute<{ data: GearsData }>("getGears", params ?? {});
	}

	async getGear(gearId: string): Promise<
		ProviderSuccessResponse<{
			data?: IDbGearWithDistance;
		}>
	> {
		return this._execute<{ data?: IDbGearWithDistance }>("getGear", {
			gearId,
		});
	}

	async createGear(
		data: IGearCreateInput,
	): Promise<ProviderSuccessResponse<{ id: string }>> {
		return this._execute<{ id: string }>("createGear", { data });
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
		return this._execute("editGear", { id, data });
	}

	async getStoreValue<T = Value>(key: StorageKeys): Promise<T | undefined> {
		return this._readStoreValue<T>(key);
	}

	async setStoreValue(key: StorageKeys, value: Value): Promise<undefined> {
		localStorage.setItem(key, JSON.stringify({ value }));
		return undefined;
	}

	async providerGearLink(
		activityId: string,
		gearId: string,
	): Promise<ProviderSuccessResponse> {
		return this._execute("providerGearLink", { activityId, gearId });
	}

	async providerGearCreate(
		provider: Providers,
		gearId: string,
	): Promise<ProviderSuccessResponse> {
		return this._execute("providerGearCreate", { provider, gearId });
	}

	async providerGearUnlink(
		activityId: string,
		gearId: string,
	): Promise<ProviderSuccessResponse> {
		return this._execute("providerGearUnlink", { activityId, gearId });
	}

	async providerSyncGear(
		provider: Providers,
	): Promise<ProviderSuccessResponse> {
		const config = this._getStoredProviderConfig(provider);
		return this._execute("providerSyncGear", {
			provider,
			credentials: config?.credentials,
			options: config?.options,
		});
	}

	async providerSync(
		provider: Providers,
		force = false,
	): Promise<ProviderSuccessResponse> {
		throw new Error("Not supported in the web client");
		// const config = this._getStoredProviderConfig(provider);
		// return this._execute("providerSync", {
		// 	provider,
		// 	force,
		// 	credentials: config?.credentials,
		// 	options: config?.options,
		// });
	}

	async providerConnect(
		provider: Providers,
		credentials: ConnectCredentials,
		options?: StravaClientOptions,
	): Promise<ProviderSuccessResponse> {
		throw new Error("Not supported in the web client");
		// return this._execute("providerConnect", {
		// 	provider,
		// 	credentials,
		// 	options,
		// });
	}

	async getInbodyData(params: {
		type: string;
	}): Promise<ProviderSuccessResponse<{ data: IInbodyData[] }>> {
		return this._execute<{ data: IInbodyData[] }>("getInbodyData", params);
	}

	async createInbodyData(
		data: IInbodyCreateInput,
	): Promise<ProviderSuccessResponse<{ data: IInbodyData }>> {
		return this._execute<{ data: IInbodyData }>("createInbodyData", {
			data,
		});
	}

	async updateInbodyData(
		data: IInbodyUpdateInput,
	): Promise<ProviderSuccessResponse<{ data: IInbodyData }>> {
		return this._execute<{ data: IInbodyData }>("updateInbodyData", {
			data,
		});
	}

	// on the web, this can not be implemented
	async getFolder(): Promise<ProviderSuccessResponse<{ data: string }>> {
		return {
			success: true,
			data: "",
		};
	}

	async signout(): Promise<undefined> {
		const result = await this._supabase.auth.signOut();
		if (result.error) {
			throw result.error;
		}
	}

	getDebugInfo(): ProviderSuccessResponse<{ data: string[] }> {
		return {
			success: true,
			data: [],
		};
	}

	async openLink(url: string): Promise<undefined> {
		window.open(url, "_blank", "noopener,noreferrer");
		return undefined;
	}

	existsFile(_params: {
		provider: Providers;
		activityId: string;
	}): Promise<ProviderSuccessResponse<{ data: { exists: boolean } }>> {
		throw new Error("Not implemented in the web client");
	}

	async uploadActivityFile(_params: {
		provider: Providers;
		providerActivityId: string;
		target: Providers;
		downloadPath: string;
	}): Promise<ProviderSuccessResponse> {
		throw new Error("Not implemented in the web client");
	}

	async downloadActivityFile(_params: {
		provider: Providers;
		providerActivityId: string;
		downloadPath: string;
	}): Promise<ProviderSuccessResponse> {
		throw new Error("Not implemented in the web client");
	}

	async exportActivityManual(_params: {
		target: Providers;
		activityId: string;
	}): Promise<ProviderSuccessResponse> {
		throw new Error("Not implemented in the web client");
	}

	public exportActivityObsidian(_params: {
		folderPath: string;
		fileName: string;
		content: string;
		fileFormat: string;
	}): Promise<ProviderSuccessResponse> {
		throw new Error("Not implemented in the web client");
	}

	private async _execute<TResponse>(
		action: string,
		payload: Record<string, unknown> = {},
	): Promise<ProviderSuccessResponse<TResponse>> {
		try {
			const accessToken = await this._getAccessToken();
			const response = await fetch(`${this._apiBaseUrl}/${action}`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${accessToken}`,
				},
				body: JSON.stringify(payload),
			});
			const json = (await response
				.json()
				.catch(() => null)) as ProviderSuccessResponse<TResponse> | null;
			if (!json) {
				return {
					success: false,
					error: "Empty response from server",
				};
			}
			return json;
		} catch (error) {
			return {
				success: false,
				error: (error as Error).message,
			};
		}
	}

	private async _getAccessToken(): Promise<string> {
		const { data, error } = await this._supabase.auth.getSession();
		if (error || !data.session?.access_token) {
			throw new Error("Missing Supabase session");
		}
		return data.session.access_token;
	}

	private _readStoreValue<T>(key: StorageKeys): T | undefined {
		const raw = localStorage.getItem(key);
		if (!raw) return undefined;
		try {
			return (JSON.parse(raw) as { value: T }).value;
		} catch {
			localStorage.removeItem(key);
		}
		return undefined;
	}

	private _getStoredProviderConfig(
		provider: Providers,
	): StoredProviderConfig | null {
		const storageKeyName =
			`${provider}_CREDENTIALS` as keyof typeof StorageKeys;
		const storageKey = StorageKeys[storageKeyName];
		if (!storageKey) return null;
		const storedValue = this._readStoreValue<unknown>(storageKey);
		if (!storedValue) return null;

		if (provider === Providers.STRAVA) {
			const credentials = storedValue as StravaCredentials;
			if (
				!credentials?.refreshToken ||
				!credentials.clientId ||
				!credentials.clientSecret
			) {
				return null;
			}
			return {
				credentials: { refreshToken: credentials.refreshToken },
				options: {
					clientId: credentials.clientId,
					clientSecret: credentials.clientSecret,
					redirectUri: credentials.redirectUri,
				},
			};
		}

		const credentials = storedValue as LoginCredentials;
		if (!credentials?.username || !credentials.password) {
			return null;
		}
		return { credentials };
	}
}
