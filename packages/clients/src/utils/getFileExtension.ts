import { FileExtensions, Providers } from "@repo/types";

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
