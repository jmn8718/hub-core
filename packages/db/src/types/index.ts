import type { IDbActivity, IDbGear, Providers } from "@repo/types";

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

export interface IInsertGearPayload {
	data: Omit<IDbGear, "id">;
	provider: Providers;
	providerId: string;
}
