import type { IDbActivity, Providers } from "@repo/types";

export interface IInsertActivityPayload {
	data: Omit<IDbActivity, "id">;
	providerData?: {
		id: string;
		provider: Providers;
		original: boolean;
		timestamp: string;
		data: string;
	};
}
