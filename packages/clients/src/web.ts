import type {
  Providers,
  ProviderSuccessResponse,
  DataClient,
  IOverviewData,
} from "@repo/types";

export class WebClient implements DataClient {
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
    return key === "demo" ? ("" as T) : undefined;
  }

  async setStoreValue(
    _key: string,
    _value: string | boolean | number,
  ): Promise<undefined> {
    return undefined;
  }

  async providerSync(
    _providerId: Providers,
    _force?: boolean,
  ): Promise<ProviderSuccessResponse> {
    return {
      success: true,
    };
  }

  // const newPath = await window.electron.ipcRenderer.invoke(
  //   Channels.FOLDER_GET,
  //   store[storeKey] || '',
  // );
  async getFolder(
    _key: string,
  ): Promise<ProviderSuccessResponse<{ data: string }>> {
    return {
      success: true,
      data: "TODO",
    };
  }
}
