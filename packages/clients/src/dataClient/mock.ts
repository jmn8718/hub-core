import type {
  ProviderSuccessResponse,
  DataClient,
  IOverviewData,
} from "@repo/types";

export class MockClient implements DataClient {
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

  async signout(): Promise<undefined> {}
}
