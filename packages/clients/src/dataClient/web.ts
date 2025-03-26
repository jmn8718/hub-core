import type { Db } from "@repo/db";
import type {
	ActivitiesData,
	GearsData,
	IOverviewData,
	ProviderSuccessResponse,
} from "@repo/types";
import type { SupabaseClient } from "../supabase.js";
import type { Client } from "./Client.js";

export class WebClient implements Client {
	private _supabase: SupabaseClient;
	private _db: Db;

	constructor(supabase: SupabaseClient, db: Db) {
		this._supabase = supabase;
		this._db = db;
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

	async getStoreValue<T = string>(key: string): Promise<T | undefined> {
		const value = localStorage.getItem(key);
		return value ? (JSON.parse(value) as { value: T }).value : undefined;
	}

	async setStoreValue(
		key: string,
		value: string | boolean | number,
	): Promise<undefined> {
		localStorage.setItem(key, JSON.stringify({ value }));
	}

	async providerSync(): Promise<ProviderSuccessResponse> {
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
}
