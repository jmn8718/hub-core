import type { Providers } from "./enums";
import type { IOverviewData, ProviderSuccessResponse } from "./types";

export abstract class DataClient {
  abstract getDataOverview(params: { limit?: number }): Promise<
    ProviderSuccessResponse<{
      data: IOverviewData[];
    }>
  >;

  abstract getStoreValue<T = string>(key: string): Promise<T | undefined>;
  abstract setStoreValue(
    key: string,
    value: string | boolean | number,
  ): Promise<undefined>;

  abstract providerSync(
    providerId: Providers,
    force?: boolean,
  ): Promise<ProviderSuccessResponse>;

  abstract getFolder(
    defaultPath: string,
    title: string,
  ): Promise<ProviderSuccessResponse<{ data: string }>>;

  abstract signout(): Promise<undefined>;
}
