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
	timestamp: number;
	timezone: string;
	distance: number;
	duration: number;
	manufacturer: string;
	locationName: string;
	locationCountry: string;
	startLatitude: number;
	startLongitude: number;
	notes?: string;
	type: ActivityType;
	subtype?: ActivitySubType;
	isEvent: 0 | 1;
}

export interface IGear {
	id: string;
	type: GearType;
}

export interface IConnection {
	provider: Providers;
	id: string;
	original: 0 | 1;
}

export type DbActivityPopulated = IDbActivity & {
	connections: IConnection[];
	gears: IGear[];
};

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

export interface IDbGearWithDistance extends IDbGear {
	distance: number;
}

export type GearsData = {
	data: IDbGearWithDistance[];
	count: number;
	cursor: string;
};

export type BasicValue = string | boolean | number;
export type Value = BasicValue | Record<string, BasicValue>;

export interface Credentials {
	username: string;
	password: string;
}
