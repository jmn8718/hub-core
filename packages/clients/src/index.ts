import { FileExtensions, Providers } from "@repo/types";

export * from "./dataClient/Client.js";
export * from "./dataClient/mock.js";
export * from "./dataClient/web.js";
export * from "./providers/ProviderManager.js";
export * from "./supabase.js";

export const getFileExtension = (provider: Providers): FileExtensions => {
	switch (provider) {
		case Providers.GARMIN:
			return FileExtensions.TCX;
		case Providers.COROS:
			return FileExtensions.FIT;
		default:
			throw new Error("Invalid provider");
	}
};
