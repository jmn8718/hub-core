import type { Providers } from "./enums";
import type { ProviderSuccessResponse } from "./types";

export abstract class DataClient {
  abstract getDataOverview(params: { limit?: number }): Promise<
    {
      distance: number;
      count: number;
      month: string;
    }[]
  >;

  abstract getStoreValue<T = string>(key: string): Promise<T | undefined>;
  abstract setStoreValue(
    key: string,
    value: string | boolean | number,
  ): Promise<undefined>;

  abstract providerSync(
    providerId: Providers,
  ): Promise<ProviderSuccessResponse>;
}
