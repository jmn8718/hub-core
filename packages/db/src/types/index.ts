import type {
	IDbActivity,
	IDbActivityLap,
	IDbGear,
	Providers,
} from "@repo/types";

export interface IInsertActivityLapPayload extends Omit<IDbActivityLap, "id"> {}

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
	laps?: IInsertActivityLapPayload[];
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
