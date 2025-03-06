import {
  type Providers,
  type ProviderSuccessResponse,
  type DataClient,
  type IOverviewData,
  Channels,
} from "@repo/types";

export class Client implements DataClient {
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

  async providerSync(
    _providerId: Providers,
    _force?: boolean,
  ): Promise<ProviderSuccessResponse> {
    return {
      success: true,
    };
  }

  async getFolder(
    defaultPath: string,
    title: string,
  ): Promise<ProviderSuccessResponse<{ data: string }>> {
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
  }

  async signout(): Promise<undefined> {}
}
