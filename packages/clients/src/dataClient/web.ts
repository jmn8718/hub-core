import { Providers, StorageKeys } from "@repo/types";
import type {
	ActivitiesData,
	ActivityRegenerationSummary,
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
import { WebOfflineCache } from "./webOfflineCache.js";

const OFFLINE_READ_ERROR =
	"You are offline and no saved data is available for this view.";
const OFFLINE_WRITE_ERROR =
	"You are offline. Connect to the internet before adding or changing data.";
const OFFLINE_CACHE_HIT_EVENT = "hub-core:offline-cache-hit";
const OFFLINE_CACHE_MISS_EVENT = "hub-core:offline-cache-miss";
const PWA_CACHE_PREFIX = "hub-core-pwa-";

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
	private readonly _offlineCache = new WebOfflineCache();

	constructor({ apiBaseUrl, supabase }: WebClientConfig) {
		this._supabase = supabase;
		this._apiBaseUrl = `${apiBaseUrl.replace(/\/$/, "")}/api/client`;
	}

	async getDataOverview({ limit }: { limit?: number }): Promise<
		ProviderSuccessResponse<{
			data: IOverviewData[];
		}>
	> {
		return this._executeCached<{ data: IOverviewData[] }>("getDataOverview", {
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
		return this._executeCached<{ data: IDailyOverviewData[] }>(
			"getDailyOverview",
			{
				startDate,
				endDate,
				periodType,
				periodCount,
			},
		);
	}

	async getWeeklyOverview({ limit }: { limit?: number }): Promise<
		ProviderSuccessResponse<{
			data: IWeeklyOverviewData[];
		}>
	> {
		return this._executeCached<{ data: IWeeklyOverviewData[] }>(
			"getWeeklyOverview",
			{
				limit,
			},
		);
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
		withoutGear?: 0 | 1;
	}): Promise<
		ProviderSuccessResponse<{
			data: ActivitiesData;
		}>
	> {
		return this._executeCached<{ data: ActivitiesData }>(
			"getActivities",
			params ?? {},
		);
	}

	async getActivity(activityId: string): Promise<
		ProviderSuccessResponse<{
			data?: DbActivityPopulated;
		}>
	> {
		return this._executeCached<{ data?: DbActivityPopulated }>("getActivity", {
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
			timestamp?: number;
			locationName?: string;
			notes?: string;
			insight?: string;
			description?: string;
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
		return this._executeCached<{ data: GearsData }>("getGears", params ?? {});
	}

	async getGear(gearId: string): Promise<
		ProviderSuccessResponse<{
			data?: IDbGearWithDistance;
		}>
	> {
		return this._executeCached<{ data?: IDbGearWithDistance }>("getGear", {
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

	async providerSyncActivity(
		_provider: Providers,
		_activityId: string,
	): Promise<ProviderSuccessResponse<{ id: string }>> {
		throw new Error("Not supported in the web client");
	}

	async providerPersistActivityCache(_params: {
		provider: Providers;
		providerActivityId: string;
	}): Promise<ProviderSuccessResponse> {
		throw new Error("Not supported in the web client");
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
		return this._executeCached<{ data: IInbodyData[] }>(
			"getInbodyData",
			params,
		);
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
		const userId = await this._getOfflineUserId();
		const result = await this._supabase.auth.signOut();
		if (result.error) {
			throw result.error;
		}
		if (userId) {
			await this._offlineCache.deleteUserData(userId).catch(() => undefined);
		}
		await this._clearPwaCaches();
	}

	getDebugInfo(): ProviderSuccessResponse<{ data: string[] }> {
		return {
			success: true,
			data: [],
		};
	}

	async regenerateActivitiesData(): Promise<
		ProviderSuccessResponse<{ data: ActivityRegenerationSummary }>
	> {
		return this._execute<{ data: ActivityRegenerationSummary }>(
			"regenerateActivitiesData",
		);
	}

	async regenerateActivityMetadata(
		activityId: string,
	): Promise<ProviderSuccessResponse> {
		return this._execute("regenerateActivityMetadata", {
			activityId,
		});
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
			if (this._isOffline()) {
				return {
					success: false,
					error: OFFLINE_WRITE_ERROR,
				};
			}

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

	private async _executeCached<TResponse>(
		action: string,
		payload: Record<string, unknown> = {},
	): Promise<ProviderSuccessResponse<TResponse>> {
		const userId = await this._getOfflineUserId();

		if (this._isOffline()) {
			const cachedResponse = userId
				? await this._readCachedResponse<TResponse>(userId, action, payload)
				: null;

			if (cachedResponse) {
				this._dispatchOfflineCacheHit();
				return cachedResponse;
			}

			this._dispatchOfflineCacheMiss();
			return {
				success: false,
				error: OFFLINE_READ_ERROR,
			};
		}

		const response = await this._execute<TResponse>(action, payload);

		if (!userId) {
			return response;
		}

		if (response.success) {
			await this._offlineCache
				.write(userId, action, payload, response)
				.catch(() => undefined);
			return response;
		}

		const cachedResponse = await this._readCachedResponse<TResponse>(
			userId,
			action,
			payload,
		);
		if (cachedResponse) {
			this._dispatchOfflineCacheHit();
			return cachedResponse;
		}

		if (this._isOfflineError(response.error)) {
			this._dispatchOfflineCacheMiss();
			return {
				success: false,
				error: OFFLINE_READ_ERROR,
			};
		}

		return response;
	}

	private async _getAccessToken(): Promise<string> {
		const { data, error } = await this._supabase.auth.getSession();
		if (error || !data.session?.access_token) {
			throw new Error("Missing Supabase session");
		}
		return data.session.access_token;
	}

	private async _getOfflineUserId(): Promise<string | null> {
		const { data, error } = await this._supabase.auth.getSession();
		if (error) {
			return null;
		}
		return data.session?.user.id ?? null;
	}

	private _isOffline(): boolean {
		return "navigator" in globalThis && navigator.onLine === false;
	}

	private _isOfflineError(error: string): boolean {
		return /failed to fetch|networkerror|load failed|network request failed/i.test(
			error,
		);
	}

	private _readCachedResponse<TResponse>(
		userId: string,
		action: string,
		payload: Record<string, unknown>,
	): Promise<ProviderSuccessResponse<TResponse> | null> {
		return this._offlineCache
			.read<TResponse>(userId, action, payload)
			.catch(() => null);
	}

	private _dispatchOfflineCacheHit(): void {
		if (typeof CustomEvent === "undefined") {
			return;
		}
		globalThis.dispatchEvent?.(new CustomEvent(OFFLINE_CACHE_HIT_EVENT));
	}

	private _dispatchOfflineCacheMiss(): void {
		if (typeof CustomEvent === "undefined") {
			return;
		}
		globalThis.dispatchEvent?.(
			new CustomEvent(OFFLINE_CACHE_MISS_EVENT, {
				detail: {
					message: OFFLINE_READ_ERROR,
				},
			}),
		);
	}

	private async _clearPwaCaches(): Promise<void> {
		if (!("caches" in globalThis)) {
			return;
		}

		const cacheNames = await caches.keys().catch(() => []);
		await Promise.all(
			cacheNames
				.filter((cacheName) => cacheName.startsWith(PWA_CACHE_PREFIX))
				.map((cacheName) => caches.delete(cacheName)),
		).catch(() => undefined);
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
