export type ProviderSuccessResponse =
  | {
      success: true;
    }
  | { success: false; error: string };
