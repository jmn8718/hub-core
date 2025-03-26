import type {
	ActivitySubType,
	ActivityType,
	GearType,
	Providers,
} from "./enums.js";

export type ProviderSuccessResponse<T = unknown> =
	| (T & { success: true })
	| { success: false; error: string };

export interface IOverviewData {
	distance: number;
	count: number;
	month: string;
}

export interface IDbActivity {
	id: string;
	name: string;
	timestamp: string;
	distance: number;
	duration: number;
	manufacturer: string;
	location_name: string;
	location_country: string;
	start_latitude: number;
	start_longitude: number;
	notes?: string;
	type: ActivityType;
	subtype?: ActivitySubType;
	is_event: 0 | 1;
}

export type DbActivityPopulated = IDbActivity & {
	shoe_id?: string;
	insole_id?: string;
	connections: IConnection[];
};

export interface IConnection {
	provider: Providers;
	id: string;
	original: 0 | 1;
}

export type ActivitiesData = {
	count: number;
	data: DbActivityPopulated[];
	cursor: string;
};

export interface IDbGear {
	id: string;
	name: string;
	code: string;
	dateBegin?: string;
	dateEnd?: string;
	maximumDistance: number;
	type: GearType;
	brand: string;
}

export type GearsData = {
	data: IDbGear[];
	count: number;
	cursor: string;
};
