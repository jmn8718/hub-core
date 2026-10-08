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
	ICloudSyncResult,
	ICloudSyncStatus,
	IConfiguredProvidersData,
	IDailyOverviewData,
	IDbActivityLap,
	IDbGearWithDistance,
	IGearCreateInput,
	IInbodyCreateInput,
	IInbodyData,
	IInbodyUpdateInput,
	IOverviewData,
	IWeeklyOverviewData,
	LapIdentifier,
	LoginCredentials,
	ProviderActivityLapBackfillSummary,
	ProviderSuccessResponse,
	StravaClientOptions,
	StravaCredentials,
	StravaPushSubscription,
	Value,
} from "@repo/types";
import type { SupabaseClient } from "../supabase.js";
import { isSessionExpired, resolveSupabaseSession } from "../supabase.js";
import type { Client } from "./Client.js";
import { WebOfflineCache, stableStringify } from "./webOfflineCache.js";

// Reads served from the offline cache (see _executeCached). Every other
// action is treated as a write that invalidates them.
const CACHED_READ_ACTIONS = new Set([
	"getDataOverview",
	"getDailyOverview",
	"getWeeklyOverview",
	"getActivities",
	"getActivity",
	"getGears",
	"getGear",
	"getInbodyData",
]);
const NON_MUTATING_ACTIONS = new Set(["getConfiguredProviders"]);
// Online, cached reads older than this are refetched before being shown.
const CACHED_READ_MAX_AGE_MS = 6 * 60 * 60 * 1000;

const OFFLINE_READ_ERROR =
	"You are offline and no saved data is available for this view.";
const OFFLINE_WRITE_ERROR =
	"You are offline. Connect to the internet before adding or changing data.";
const OFFLINE_CACHE_HIT_EVENT = "hub-core:offline-cache-hit";
const OFFLINE_CACHE_MISS_EVENT = "hub-core:offline-cache-miss";
const CACHED_READ_REFRESH_EVENT = "hub-core:cached-read-refresh";
const PWA_CACHE_PREFIX = "hub-core-pwa-";

interface WebClientConfig {
	apiBaseUrl: string;
	supabase: SupabaseClient;
	supabaseUrl: string;
}

type StoredProviderConfig = {
	credentials: ConnectCredentials;
	options?: StravaClientOptions;
};

export class WebClient implements Client {
	readonly isBrowserClient = true;
	private readonly _supabase: SupabaseClient;
	private readonly _apiBaseUrl: string;
	private readonly _apiRootUrl: string;
	private readonly _supabaseUrl: string;
	private readonly _offlineCache = new WebOfflineCache();

	constructor({ apiBaseUrl, supabase, supabaseUrl }: WebClientConfig) {
		this._supabase = supabase;
		this._apiRootUrl = apiBaseUrl.replace(/\/$/, "");
		this._apiBaseUrl = `${this._apiRootUrl}/api/client`;
		this._supabaseUrl = supabaseUrl;
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

	async getWeeklyOverview({
		limit,
		targetWeekStart,
	}: {
		limit?: number;
		targetWeekStart?: string;
	}): Promise<
		ProviderSuccessResponse<{
			data: IWeeklyOverviewData[];
		}>
	> {
		return this._executeCached<{ data: IWeeklyOverviewData[] }>(
			"getWeeklyOverview",
			{
				limit,
				targetWeekStart,
			},
		);
	}

	async getActivities(params: {
		cursor?: string;
		limit?: number;
		offset?: number;
		type?: ActivityType;
		subtype?: ActivitySubType | null;
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
			subtype?: ActivitySubType | null;
			isEvent?: 0 | 1;
		},
	): Promise<ProviderSuccessResponse> {
		return this._execute("editActivity", { id, data });
	}

	async editActivityLap(
		id: string,
		data: {
			identifier?: LapIdentifier;
			activityId?: string;
		},
	): Promise<ProviderSuccessResponse<{ data?: IDbActivityLap }>> {
		return this._execute<{ data?: IDbActivityLap }>("editActivityLap", {
			id,
			data,
		});
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

	async providerGearDelete(
		provider: Providers,
		gearId: string,
	): Promise<ProviderSuccessResponse> {
		return this._execute("providerGearDelete", { provider, gearId });
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
		const config = this._getStoredProviderConfig(provider);
		return this._execute("providerSync", {
			provider,
			force,
			credentials: config?.credentials,
			options: config?.options,
		});
	}

	async providerBackfillActivityLaps(provider: Providers): Promise<
		ProviderSuccessResponse<{
			data: ProviderActivityLapBackfillSummary;
		}>
	> {
		const config = this._getStoredProviderConfig(provider);
		return this._execute<{ data: ProviderActivityLapBackfillSummary }>(
			"providerBackfillActivityLaps",
			{
				provider,
				credentials: config?.credentials,
				options: config?.options,
			},
		);
	}

	async getConfiguredProviders(): Promise<
		ProviderSuccessResponse<{ data: IConfiguredProvidersData }>
	> {
		return this._execute("getConfiguredProviders");
	}

	async providerSyncActivity(
		provider: Providers,
		activityId: string,
	): Promise<ProviderSuccessResponse<{ id: string }>> {
		const config = this._getStoredProviderConfig(provider);
		return this._execute<{ id: string }>("providerSyncActivity", {
			provider,
			activityId,
			credentials: config?.credentials,
			options: config?.options,
		});
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
		return this._execute("providerConnect", {
			provider,
			credentials,
			options,
		});
	}

	async getStravaSubscriptions(): Promise<
		ProviderSuccessResponse<{ data: StravaPushSubscription[] }>
	> {
		return this._executeApiRoute<{ data: StravaPushSubscription[] }>(
			"/api/strava/subscriptions",
			{ method: "GET" },
		);
	}

	async createStravaSubscription(
		callbackUrl: string,
	): Promise<ProviderSuccessResponse<{ data: StravaPushSubscription }>> {
		return this._executeApiRoute<{ data: StravaPushSubscription }>(
			"/api/strava/subscriptions",
			{
				method: "POST",
				body: JSON.stringify({ callbackUrl }),
			},
		);
	}

	async deleteStravaSubscription(id: number): Promise<ProviderSuccessResponse> {
		return this._executeApiRoute("/api/strava/subscriptions", {
			method: "DELETE",
			body: JSON.stringify({ id }),
		});
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

	async getCloudSyncStatus(): Promise<
		ProviderSuccessResponse<{ data: ICloudSyncStatus }>
	> {
		const session = await resolveSupabaseSession({
			supabase: this._supabase,
			supabaseUrl: this._supabaseUrl,
		});
		return {
			success: true,
			data: {
				configured: true,
				authenticated: !!session?.access_token,
				email: session?.user.email ?? null,
				userId: session?.user.id ?? null,
				lastSyncedAt: null,
				validation: null,
			},
		};
	}

	async signInCloud(): Promise<ProviderSuccessResponse> {
		return {
			success: false,
			error: "Use the web sign-in flow instead",
		};
	}

	async syncCloud(): Promise<
		ProviderSuccessResponse<{ data: ICloudSyncResult }>
	> {
		return {
			success: false,
			error: "Cloud sync is not supported in the web client",
		};
	}

	async pullCloud(): Promise<
		ProviderSuccessResponse<{ data: ICloudSyncResult }>
	> {
		return {
			success: false,
			error: "Cloud sync is not supported in the web client",
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
		this._clearStoredProviderCredentials();
		await this._clearPwaCaches();
	}

	// Provider credentials live in localStorage on the web; never leave them
	// behind for the next person who signs in on the same browser.
	private _clearStoredProviderCredentials() {
		const keys = [
			StorageKeys.COROS_CREDENTIALS,
			StorageKeys.COROS_VALIDATED,
			StorageKeys.GARMIN_CREDENTIALS,
			StorageKeys.GARMIN_VALIDATED,
			StorageKeys.STRAVA_CREDENTIALS,
			StorageKeys.STRAVA_VALIDATED,
		];
		for (const key of keys) {
			try {
				localStorage.removeItem(key);
			} catch {
				// storage unavailable; nothing to clear
			}
		}
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
		return Promise.resolve({
			success: true,
			data: { exists: false },
		});
	}

	async uploadActivityFile(params: {
		provider?: Providers;
		providerActivityId?: string;
		target: Providers;
		downloadPath?: string;
		fileName?: string;
		fileBytes?: Uint8Array;
	}): Promise<ProviderSuccessResponse> {
		try {
			if (this._isOffline()) {
				return {
					success: false,
					error: OFFLINE_WRITE_ERROR,
				};
			}
			if (!params.fileBytes?.length) {
				return {
					success: false,
					error: "Missing upload file",
				};
			}

			const formData = new FormData();
			formData.set("target", params.target);
			formData.set(
				"file",
				new Blob([params.fileBytes], { type: "application/octet-stream" }),
				params.fileName ?? "activity-upload.fit",
			);

			const response = await this._fetchAuthorized(
				"/api/provider-files/upload",
				{
					method: "POST",
					body: formData,
				},
			);
			if (!response.ok) {
				return {
					success: false,
					error: await this._readResponseError(
						response,
						"Upload request failed",
					),
				};
			}

			return {
				success: true,
			};
		} catch (error) {
			return {
				success: false,
				error: (error as Error).message,
			};
		}
	}

	async downloadActivityFile(params: {
		provider: Providers;
		providerActivityId: string;
		downloadPath?: string;
	}): Promise<ProviderSuccessResponse> {
		try {
			if (this._isOffline()) {
				return {
					success: false,
					error: OFFLINE_WRITE_ERROR,
				};
			}

			const query = new URLSearchParams({
				provider: params.provider,
				providerActivityId: params.providerActivityId,
			});
			const response = await this._fetchAuthorized(
				`/api/provider-files/download?${query.toString()}`,
				{ method: "GET" },
			);
			if (!response.ok) {
				return {
					success: false,
					error: await this._readResponseError(
						response,
						"Download request failed",
					),
				};
			}

			const blob = await response.blob();
			const fileName =
				this._extractFileName(response.headers.get("content-disposition")) ??
				`${params.providerActivityId}.fit`;
			const objectUrl = URL.createObjectURL(blob);
			const anchor = document.createElement("a");
			anchor.href = objectUrl;
			anchor.download = fileName;
			anchor.style.display = "none";
			document.body.append(anchor);
			anchor.click();
			anchor.remove();
			window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);

			return {
				success: true,
			};
		} catch (error) {
			return {
				success: false,
				error: (error as Error).message,
			};
		}
	}

	async exportActivityManual(params: {
		target: Providers;
		activityId: string;
	}): Promise<ProviderSuccessResponse> {
		return this._execute("exportActivityManual", params);
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

			const response = await this._fetchAuthorized(
				`${this._apiBaseUrl}/${action}`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(payload),
				},
				{ absolute: true },
			);
			const json = (await response
				.json()
				.catch(() => null)) as ProviderSuccessResponse<TResponse> | null;
			if (!json) {
				return {
					success: false,
					error: "Empty response from server",
				};
			}
			if (json.success) {
				await this._invalidateCachedReads(action, payload);
			}
			return json;
		} catch (error) {
			return {
				success: false,
				error: (error as Error).message,
			};
		}
	}

	private async _invalidateCachedReads(
		action: string,
		_payload: Record<string, unknown>,
	): Promise<void> {
		if (CACHED_READ_ACTIONS.has(action) || NON_MUTATING_ACTIONS.has(action)) {
			return;
		}
		const userId = await this._getOfflineUserId();
		if (!userId) {
			return;
		}
		// Any write can change what a list, an overview or a detail returns;
		// drop every cached read for this user so the next read is fresh and
		// the cache is repopulated with current data.
		await this._offlineCache.deleteUserData(userId).catch(() => undefined);
	}

	private async _executeApiRoute<TResponse>(
		path: string,
		init: RequestInit,
	): Promise<ProviderSuccessResponse<TResponse>> {
		try {
			if (this._isOffline()) {
				return {
					success: false,
					error: OFFLINE_WRITE_ERROR,
				};
			}

			const response = await this._fetchAuthorized(path, {
				...init,
				headers: {
					"Content-Type": "application/json",
					...(init.headers ?? {}),
				},
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

	/**
	 * Sends the request with the current access token. A 401 means the token
	 * was stale (typically the persisted copy after an expiry); the session is
	 * refreshed once and the request retried with the new token.
	 */
	private async _fetchAuthorized(
		path: string,
		init: RequestInit,
		options: { absolute?: boolean } = {},
	): Promise<Response> {
		const url = options.absolute ? path : `${this._apiRootUrl}${path}`;
		const send = async (accessToken: string) => {
			const headers = new Headers(init.headers ?? {});
			headers.set("Authorization", `Bearer ${accessToken}`);
			return fetch(url, { ...init, headers });
		};

		const response = await send(await this._getAccessToken());
		if (response.status !== 401) {
			return response;
		}
		const refreshed = await this._supabase.auth
			.refreshSession()
			.then(({ data }) => data.session?.access_token ?? null)
			.catch(() => null);
		if (!refreshed) {
			return response;
		}
		return send(refreshed);
	}

	private async _readResponseError(
		response: Response,
		fallback: string,
	): Promise<string> {
		const json = (await response.json().catch(() => null)) as {
			error?: string;
		} | null;
		return json?.error || fallback;
	}

	private _extractFileName(contentDisposition: string | null): string | null {
		if (!contentDisposition) {
			return null;
		}
		const match = contentDisposition.match(
			/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i,
		);
		const rawValue = match?.[1] ?? match?.[2];
		return rawValue ? decodeURIComponent(rawValue) : null;
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

		if (!userId) {
			return this._execute<TResponse>(action, payload);
		}

		const cachedEntry = await this._offlineCache
			.readEntry<TResponse>(userId, action, payload)
			.catch(() => null);
		// Online, a stale entry is not worth showing first: fetch fresh instead.
		// Offline (above), any entry is better than nothing.
		const isFresh =
			cachedEntry !== null &&
			Date.now() - Date.parse(cachedEntry.updatedAt) < CACHED_READ_MAX_AGE_MS;
		if (cachedEntry && isFresh) {
			void this._refreshCachedResponse(
				userId,
				action,
				payload,
				cachedEntry.response,
			);
			return cachedEntry.response;
		}

		const response = await this._execute<TResponse>(action, payload);
		if (response.success) {
			await this._offlineCache
				.write(userId, action, payload, response)
				.catch(() => undefined);
			return response;
		}

		if (this._isOfflineError(response.error)) {
			// navigator.onLine can be true while the network is unusable: a
			// stale entry beats "no saved data" in that case.
			if (cachedEntry) {
				this._dispatchOfflineCacheHit();
				return cachedEntry.response;
			}
			this._dispatchOfflineCacheMiss();
			return {
				success: false,
				error: OFFLINE_READ_ERROR,
			};
		}

		return response;
	}

	private async _refreshCachedResponse<TResponse>(
		userId: string,
		action: string,
		payload: Record<string, unknown>,
		cachedResponse: ProviderSuccessResponse<TResponse>,
	): Promise<void> {
		const response = await this._execute<TResponse>(action, payload);
		if (!response.success) {
			return;
		}

		try {
			await this._offlineCache.write(userId, action, payload, response);
		} catch {
			return;
		}

		if (this._responsesDiffer(cachedResponse, response)) {
			this._dispatchCachedReadRefresh(action);
		}
	}

	private async _getAccessToken(): Promise<string> {
		let session = await resolveSupabaseSession({
			supabase: this._supabase,
			supabaseUrl: this._supabaseUrl,
		});
		let refreshError: string | null = null;
		if (!session || isSessionExpired(session)) {
			// The quick path gave up or returned an expired token: wait for the
			// real refresh instead of sending a token the server will reject.
			const { data, error } = await this._supabase.auth
				.getSession()
				.catch((caught: unknown) => ({
					data: { session: null },
					error: caught as { message?: string } | null,
				}));
			session = data.session ?? null;
			refreshError = error?.message ?? null;
		}
		if (!session?.access_token) {
			// Keep the refresh failure in the message: a network error here must
			// still reach the offline cache fallback in _executeCached.
			throw new Error(
				refreshError
					? `Missing Supabase session: ${refreshError}`
					: "Missing Supabase session",
			);
		}
		return session.access_token;
	}

	private async _getOfflineUserId(): Promise<string | null> {
		const session = await resolveSupabaseSession({
			supabase: this._supabase,
			supabaseUrl: this._supabaseUrl,
		});
		return session?.user.id ?? null;
	}

	private _isOffline(): boolean {
		return "navigator" in globalThis && navigator.onLine === false;
	}

	private _isOfflineError(error: string): boolean {
		return /failed to fetch|fetch failed|networkerror|load failed|network request failed|AuthRetryableFetchError|ECONNREFUSED|ENOTFOUND/i.test(
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

	private _dispatchCachedReadRefresh(action: string): void {
		if (typeof CustomEvent === "undefined") {
			return;
		}
		globalThis.dispatchEvent?.(
			new CustomEvent(CACHED_READ_REFRESH_EVENT, {
				detail: { action },
			}),
		);
	}

	private _responsesDiffer<TResponse>(
		current: ProviderSuccessResponse<TResponse>,
		next: ProviderSuccessResponse<TResponse>,
	): boolean {
		return stableStringify(current) !== stableStringify(next);
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
