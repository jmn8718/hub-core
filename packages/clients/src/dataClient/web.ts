import type {
  ProviderSuccessResponse,
  IOverviewData,
  IDbGear,
  ActivitiesData,
} from "@repo/types";
import type { SupabaseClient } from "../supabase.js";
import { Client } from "./Client.js";

export class WebClient implements Client {
  private _supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this._supabase = supabase;
  }

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

  async getActivities(_params: { skip?: number; size?: number }): Promise<
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

  async getGears(_params: { skip?: number; size?: number }): Promise<
    ProviderSuccessResponse<{
      data: IDbGear[];
    }>
  > {
    return {
      success: true,
      data: [],
    };
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
}
