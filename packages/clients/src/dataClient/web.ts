import type { Db } from "@repo/db";
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
import type { ProviderManager } from "../providers/ProviderManager.js";
import type { SupabaseClient } from "../supabase.js";
import type { Client } from "./Client.js";

export class WebClient implements Client {
	private _supabase: SupabaseClient;
	private _db: Db;
	private _manager: ProviderManager;

	constructor(supabase: SupabaseClient, db: Db, manager: ProviderManager) {
		this._supabase = supabase;
		this._db = db;
		this._manager = manager;
	}

	async getDataOverview({ limit }: { limit?: number }): Promise<
		ProviderSuccessResponse<{
			data: IOverviewData[];
		}>
	> {
		try {
			const data = await this._db.getActivitiesOverview(limit);
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
	}): Promise<
		ProviderSuccessResponse<{
			data: ActivitiesData;
		}>
	> {
		try {
			const data = await this._db.getActivities(params);
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
			const data = await this._db.getActivity(activityId);
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

	async editActivity(
		id: string,
		data: {
			locationName?: string;
			notes?: string;
			locationCountry?: string;
			name?: string;
		},
	): Promise<ProviderSuccessResponse> {
		try {
			await this._db.editActivity(id, data);
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
			const data = await this._db.getGears(params);
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
			const data = await this._db.getGear(gearId);
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
			await this._db.editGear(id, data);
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

	async providerGearLink(
		activityId: string,
		gearId: string,
	): Promise<ProviderSuccessResponse> {
		try {
			await this._manager.linkGear({ activityId, gearId });
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
			await this._manager.unlinkGear({ activityId, gearId });
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

	async providerSyncGear(
		provider: Providers,
	): Promise<ProviderSuccessResponse> {
		try {
			await this._manager.syncGears(provider);
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
			await this._manager.sync(provider, force);
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
		credentials: Credentials,
	): Promise<ProviderSuccessResponse> {
		try {
			await this._manager.connect(provider, credentials);
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
		throw new Error("Not implemented");
	}

	existsFile(params: {
		provider: Providers;
		activityId: string;
	}): Promise<ProviderSuccessResponse<{ data: { exists: boolean } }>> {
		throw new Error("Not implemented");
	}
}
