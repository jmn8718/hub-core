export type ProviderSuccessResponse<T = unknown> =
  | (T & { success: true })
  | { success: false; error: string };

export interface IOverviewData {
  distance: number;
  count: number;
  month: string;
}
