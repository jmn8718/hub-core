import type {
  Providers,
  ProviderSuccessResponse,
  DataClient,
} from "@repo/types";

export class WebClient implements DataClient {
  async getDataOverview({
    limit: _limit,
  }: {
    limit?: number;
  }): Promise<{ distance: number; count: number; month: string }[]> {
    return [
      { distance: 1200, count: 3, month: "2025-01" },
      { distance: 1500, count: 5, month: "2024-12" },
      { distance: 1000, count: 3, month: "2024-11" },
      { distance: 900, count: 3, month: "2024-10" },
      { distance: 800, count: 3, month: "2024-09" },
    ];
  }

  async getStoreValue<T = string>(key: string): Promise<T | undefined> {
    return key === "demo" ? ("" as T) : undefined;
  }

  async setStoreValue(
    _key: string,
    _value: string | boolean | number,
  ): Promise<undefined> {
    return undefined;
  }

  async providerSync(_providerId: Providers): Promise<ProviderSuccessResponse> {
    return {
      success: true,
    };
  }
}
