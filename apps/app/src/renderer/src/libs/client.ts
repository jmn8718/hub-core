import type { Client } from "@repo/clients";
import { resolveSupabaseSession } from "@repo/clients";
import {
	type ActivitiesData,
	type ActivityRegenerationSummary,
	type ActivitySubType,
	type ActivityType,
	Channels,
	type ConnectCredentials,
	type DbActivityPopulated,
	type GearsData,
	type IActivityCreateInput,
	type ICloudSyncResult,
	type ICloudSyncStatus,
	type IDailyOverviewData,
	type IDbGearWithDistance,
	type IGearCreateInput,
	type IInbodyCreateInput,
	type IInbodyData,
	type IInbodyUpdateInput,
	type IOverviewData,
	type IWeeklyOverviewData,
	type InbodyType,
	type ProviderSuccessResponse,
	type Providers,
	type StorageKeys,
	type StravaClientOptions,
	type StravaPushSubscription,
	type Value,
} from "@repo/types";
import { getCloudConfig } from "./cloud.js";

export class AppClient implements Client {
	private readonly _cloudConfig = getCloudConfig();

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
		try {
			const data = await window.electron.ipcRenderer.invoke(
				Channels.DB_DAILY_OVERVIEW,
				{
					startDate,
					endDate,
					periodType,
					periodCount,
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

	async getWeeklyOverview({ limit }: { limit?: number }): Promise<
		ProviderSuccessResponse<{
			data: IWeeklyOverviewData[];
		}>
	> {
		try {
			const data = await window.electron.ipcRenderer.invoke(
				Channels.DB_WEEKLY_OVERVIEW,
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

	async getActivity(activityId: string): Promise<
		ProviderSuccessResponse<{
			data?: DbActivityPopulated;
		}>
	> {
		try {
			const data = (await window.electron.ipcRenderer.invoke(
				Channels.DB_ACTIVITY,
				activityId,
			)) as Awaited<Promise<DbActivityPopulated | undefined>>;
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

	async regenerateActivityMetadata(
		activityId: string,
	): Promise<ProviderSuccessResponse> {
		try {
			await window.electron.ipcRenderer.invoke(
				Channels.DB_ACTIVITY_METADATA_REGENERATE,
				{ activityId },
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

	async createActivity(
		data: IActivityCreateInput,
	): Promise<ProviderSuccessResponse<{ id: string }>> {
		try {
			const result = (await window.electron.ipcRenderer.invoke(
				Channels.DB_ACTIVITY_CREATE,
				{
					data,
				},
			)) as Awaited<Promise<{ id: string }>>;
			return {
				success: true,
				id: result.id,
			};
		} catch (err) {
			return {
				success: false,
				error: (err as Error).message,
			};
		}
	}

	async editActivity(
		id: string,
		data: {
			timestamp?: number;
			locationName?: string;
			locationCountry?: string;
			name?: string;
			notes?: string;
			insight?: string;
			description?: string;
			type?: ActivityType;
			subtype?: ActivitySubType;
			isEvent?: 0 | 1;
		},
	): Promise<ProviderSuccessResponse> {
		try {
			await window.electron.ipcRenderer.invoke(Channels.DB_ACTIVITY_EDIT, {
				activityId: id,
				data,
			});
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

	async deleteActivity(activityId: string): Promise<ProviderSuccessResponse> {
		try {
			await window.electron.ipcRenderer.invoke(Channels.DB_ACTIVITY_DELETE, {
				activityId,
			});
			return { success: true };
		} catch (err) {
			return {
				success: false,
				error: (err as Error).message,
			};
		}
	}

	async linkActivityConnection(
		activityId: string,
		providerActivityId: string,
	): Promise<ProviderSuccessResponse> {
		try {
			await window.electron.ipcRenderer.invoke(
				Channels.DB_ACTIVITY_CONNECTION_LINK,
				{ activityId, providerActivityId },
			);
			return { success: true };
		} catch (err) {
			return {
				success: false,
				error: (err as Error).message,
			};
		}
	}

	async unlinkActivityConnection(
		activityId: string,
		providerActivityId: string,
	): Promise<ProviderSuccessResponse> {
		try {
			await window.electron.ipcRenderer.invoke(
				Channels.DB_ACTIVITY_CONNECTION_UNLINK,
				{ activityId, providerActivityId },
			);
			return { success: true };
		} catch (err) {
			return {
				success: false,
				error: (err as Error).message,
			};
		}
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
		try {
			const data = (await window.electron.ipcRenderer.invoke(
				Channels.DB_GEARS,
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

	async getGear(gearId: string): Promise<
		ProviderSuccessResponse<{
			data?: IDbGearWithDistance;
		}>
	> {
		try {
			const data = (await window.electron.ipcRenderer.invoke(
				Channels.DB_GEAR,
				gearId,
			)) as Awaited<Promise<IDbGearWithDistance | undefined>>;
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

	async createGear(
		data: IGearCreateInput,
	): Promise<ProviderSuccessResponse<{ id: string }>> {
		try {
			const result = (await window.electron.ipcRenderer.invoke(
				Channels.DB_GEAR_CREATE,
				data,
			)) as Awaited<Promise<{ id: string }>>;
			return {
				success: true,
				...result,
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
			await window.electron.ipcRenderer.invoke(Channels.DB_GEAR_EDIT, {
				gearId: id,
				data,
			});
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
		return window.electron.ipcRenderer
			.invoke(Channels.STORE_GET, { key })
			.then((data: T | undefined) => data);
	}

	async setStoreValue(key: StorageKeys, value: Value): Promise<undefined> {
		await window.electron.ipcRenderer.invoke(Channels.STORE_SET, {
			key,
			value,
		});
		localStorage.setItem(key, JSON.stringify({ value }));
	}

	async providerSyncGear(
		provider: Providers,
	): Promise<ProviderSuccessResponse> {
		try {
			await window.electron.ipcRenderer.invoke(Channels.PROVIDERS_SYNC_GEAR, {
				provider,
			});
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

	async providerGearLink(
		activityId: string,
		gearId: string,
	): Promise<ProviderSuccessResponse> {
		try {
			await window.electron.ipcRenderer.invoke(Channels.PROVIDERS_GEAR_LINK, {
				activityId,
				gearId,
			});
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

	async providerGearCreate(
		provider: Providers,
		gearId: string,
	): Promise<ProviderSuccessResponse> {
		try {
			await window.electron.ipcRenderer.invoke(Channels.PROVIDERS_GEAR_CREATE, {
				provider,
				gearId,
			});
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

	async providerGearDelete(
		provider: Providers,
		gearId: string,
	): Promise<ProviderSuccessResponse> {
		try {
			await window.electron.ipcRenderer.invoke(Channels.PROVIDERS_GEAR_DELETE, {
				provider,
				gearId,
			});
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

	async providerGearUnlink(
		activityId: string,
		gearId: string,
	): Promise<ProviderSuccessResponse> {
		try {
			await window.electron.ipcRenderer.invoke(Channels.PROVIDERS_GEAR_UNLINK, {
				activityId,
				gearId,
			});
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

	async providerSync(
		provider: Providers,
		force = false,
	): Promise<ProviderSuccessResponse> {
		try {
			await window.electron.ipcRenderer.invoke(Channels.PROVIDERS_SYNC, {
				provider,
				force,
			});
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

	async providerSyncActivity(
		provider: Providers,
		activityId: string,
	): Promise<ProviderSuccessResponse<{ id: string }>> {
		try {
			const id = (await window.electron.ipcRenderer.invoke(
				Channels.PROVIDERS_ACTIVITY_SYNC,
				{
					provider,
					activityId,
				},
			)) as string;
			return {
				success: true,
				id,
			};
		} catch (err) {
			return {
				success: false,
				error: (err as Error).message,
			};
		}
	}

	async providerPersistActivityCache(params: {
		provider: Providers;
		providerActivityId: string;
	}): Promise<ProviderSuccessResponse> {
		try {
			await window.electron.ipcRenderer.invoke(
				Channels.PROVIDERS_ACTIVITY_CACHE_PERSIST,
				params,
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

	async providerConnect(
		provider: Providers,
		credentials: ConnectCredentials,
		options?: StravaClientOptions,
	): Promise<ProviderSuccessResponse> {
		try {
			await window.electron.ipcRenderer.invoke(Channels.PROVIDERS_CONNECT, {
				provider,
				credentials,
				options,
			});
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

	async getStravaSubscriptions(): Promise<
		ProviderSuccessResponse<{ data: StravaPushSubscription[] }>
	> {
		return this._executeCloudApi<{ data: StravaPushSubscription[] }>(
			"/api/strava/subscriptions",
			{ method: "GET" },
		);
	}

	async createStravaSubscription(
		callbackUrl: string,
	): Promise<ProviderSuccessResponse<{ data: StravaPushSubscription }>> {
		return this._executeCloudApi<{ data: StravaPushSubscription }>(
			"/api/strava/subscriptions",
			{
				method: "POST",
				body: JSON.stringify({ callbackUrl }),
			},
		);
	}

	async deleteStravaSubscription(id: number): Promise<ProviderSuccessResponse> {
		return this._executeCloudApi("/api/strava/subscriptions", {
			method: "DELETE",
			body: JSON.stringify({ id }),
		});
	}

	async getFolder(
		defaultPath: string,
		title: string,
	): Promise<ProviderSuccessResponse<{ data: string }>> {
		try {
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
		} catch (err) {
			return {
				success: false,
				error: (err as Error).message,
			};
		}
	}

	async getCloudSyncStatus(): Promise<
		ProviderSuccessResponse<{ data: ICloudSyncStatus }>
	> {
		try {
			if (!this._cloudConfig) {
				return {
					success: true,
					data: {
						configured: false,
						authenticated: false,
						email: null,
						userId: null,
						validation: null,
					},
				};
			}

			const session = await resolveSupabaseSession({
				supabase: this._cloudConfig.supabase,
				supabaseUrl: this._cloudConfig.supabaseUrl,
			});

			const validation =
				session?.access_token && this._cloudConfig.apiBaseUrl
					? ((await window.electron.ipcRenderer.invoke(
							Channels.DB_CLOUD_SYNC_VALIDATE,
							{
								accessToken: session.access_token,
								apiBaseUrl: this._cloudConfig.apiBaseUrl,
							},
						)) as ICloudSyncStatus["validation"])
					: null;

			return {
				success: true,
				data: {
					configured: true,
					authenticated: !!session?.access_token,
					email: session?.user.email ?? null,
					userId: validation?.userId ?? null,
					validation,
				},
			};
		} catch (err) {
			return {
				success: false,
				error: (err as Error).message,
			};
		}
	}

	async signInCloud(
		email: string,
		password: string,
	): Promise<ProviderSuccessResponse> {
		try {
			if (!this._cloudConfig) {
				throw new Error("Cloud sync is not configured in this desktop build");
			}
			if (!email.trim() || !password) {
				throw new Error("Missing Supabase email or password");
			}

			const { error } =
				await this._cloudConfig.supabase.auth.signInWithPassword({
					email: email.trim(),
					password,
				});
			if (error) {
				throw error;
			}

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

	async syncCloud(): Promise<
		ProviderSuccessResponse<{ data: ICloudSyncResult }>
	> {
		try {
			if (!this._cloudConfig) {
				throw new Error("Cloud sync is not configured in this desktop build");
			}

			const session = await resolveSupabaseSession({
				supabase: this._cloudConfig.supabase,
				supabaseUrl: this._cloudConfig.supabaseUrl,
			});
			const accessToken = session?.access_token;
			if (!accessToken) {
				throw new Error("Sign in to Supabase before syncing");
			}

			const data = (await window.electron.ipcRenderer.invoke(
				Channels.DB_CLOUD_SYNC,
				{
					accessToken,
					apiBaseUrl: this._cloudConfig.apiBaseUrl,
				},
			)) as ICloudSyncResult;

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

	async signout(): Promise<undefined> {
		if (!this._cloudConfig) {
			return undefined;
		}
		const { error } = await this._cloudConfig.supabase.auth.signOut();
		if (error) {
			throw error;
		}
		return undefined;
	}

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

	async regenerateActivitiesData(): Promise<
		ProviderSuccessResponse<{ data: ActivityRegenerationSummary }>
	> {
		try {
			const data = await window.electron.ipcRenderer.invoke(
				Channels.DB_ACTIVITIES_REGENERATE,
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

	openLink(url: string): Promise<undefined> {
		return window.electron.ipcRenderer.invoke(Channels.OPEN_LINK, { url });
	}

	async existsFile(params: {
		provider: Providers;
		activityId: string;
	}): Promise<ProviderSuccessResponse<{ data: { exists: boolean } }>> {
		try {
			const exists = await window.electron.ipcRenderer.invoke(
				Channels.FILE_EXISTS,
				params,
			);
			return {
				success: true,
				data: { exists },
			};
		} catch (err) {
			return {
				success: false,
				error: (err as Error).message,
			};
		}
	}

	async uploadActivityFile(params: {
		provider: Providers;
		providerActivityId: string;
		target: Providers;
		downloadPath: string;
	}): Promise<ProviderSuccessResponse> {
		try {
			await window.electron.ipcRenderer.invoke(
				Channels.ACTIVITY_UPLOAD_FILE,
				params,
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

	async downloadActivityFile(params: {
		provider: Providers;
		providerActivityId: string;
		downloadPath: string;
	}): Promise<ProviderSuccessResponse> {
		try {
			await window.electron.ipcRenderer.invoke(
				Channels.ACTIVITY_DOWNLOAD_FILE,
				params,
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

	async exportActivityObsidian(params: {
		folderPath: string;
		fileName: string;
		content: string;
		fileFormat: string;
	}): Promise<ProviderSuccessResponse> {
		try {
			const result = (await window.electron.ipcRenderer.invoke(
				Channels.ACTIVITY_EXPORT_OBSIDIAN,
				params,
			)) as Promise<ProviderSuccessResponse>;
			return result;
		} catch (err) {
			return {
				success: false,
				error: (err as Error).message,
			};
		}
	}

	async exportActivityManual(params: {
		target: Providers;
		activityId: string;
	}): Promise<ProviderSuccessResponse> {
		try {
			await window.electron.ipcRenderer.invoke(
				Channels.ACTIVITY_EXPORT_MANUAL,
				params,
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

	async getInbodyData(params: {
		type: InbodyType;
	}): Promise<ProviderSuccessResponse<{ data: IInbodyData[] }>> {
		try {
			const data = await window.electron.ipcRenderer.invoke(
				Channels.DB_INBODY_DATA,
				params,
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

	async createInbodyData(
		data: IInbodyCreateInput,
	): Promise<ProviderSuccessResponse> {
		try {
			await window.electron.ipcRenderer.invoke(Channels.DB_INBODY_CREATE, data);
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

	async updateInbodyData(
		data: IInbodyUpdateInput,
	): Promise<ProviderSuccessResponse> {
		try {
			await window.electron.ipcRenderer.invoke(Channels.DB_INBODY_UPDATE, data);
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

	private async _executeCloudApi<TResponse>(
		path: string,
		init: RequestInit,
	): Promise<ProviderSuccessResponse<TResponse>> {
		try {
			if (!this._cloudConfig) {
				throw new Error("Cloud sync is not configured in this desktop build");
			}

			const session = await resolveSupabaseSession({
				supabase: this._cloudConfig.supabase,
				supabaseUrl: this._cloudConfig.supabaseUrl,
			});
			const accessToken = session?.access_token;
			if (!accessToken) {
				throw new Error(
					"Sign in to Supabase before using Strava subscriptions",
				);
			}

			const response = await fetch(`${this._cloudConfig.apiBaseUrl}${path}`, {
				...init,
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${accessToken}`,
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
		} catch (err) {
			return {
				success: false,
				error: (err as Error).message,
			};
		}
	}
}
