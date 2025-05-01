import type { IDbActivity, IDbGear, Providers } from "@repo/types";

export interface IInsertActivityPayload {
	activity: {
		data: Omit<IDbActivity, "id">;
		providerActivity?: {
			id: string;
			provider: Providers;
			original: boolean;
			timestamp: number;
			data: string;
		};
	};
	gears?: IInsertGearPayload[];
}

export interface IInsertGearPayload {
	data: Omit<IDbGear, "id">;
	providerGear: {
		id: string;
		provider: Providers;
		data: string;
	};
}
