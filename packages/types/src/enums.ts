export enum Providers {
	GARMIN = "GARMIN",
	COROS = "COROS",
}

export enum AppType {
	WEB = "web",
	DESKTOP = "desktop",
}

export enum GearType {
	SHOES = "shoes",
	INSOLE = "insole",
	BIKE = "bike",
}

export enum ActivityType {
	RUN = "run",
	BIKE = "bike",
	GYM = "gym",
	CARDIO = "cardio",
	SWIM = "swim",
	HIKE = "hike",
}

export enum ActivitySubType {
	INDOOR = "indoor",
	EASY_RUN = "easy-run",
	TRAINING = "training",
	ROAD = "road",
	TRAIL = "trail",
}

export enum Channels {
	FOLDER_GET = "FOLDER_GET",
	DB_ACTIVITIES = "DB_ACTIVITIES",
	DB_GEAR = "DB_GEAR",
	DB_OVERVIEW = "DB_OVERVIEW",
	PROVIDERS_SYNC = "PROVIDERS_SYNC",
	STORE_GET = "STORE_GET",
	STORE_SET = "STORE_SET",
}

export enum StorageKeys {
	COROS_CREDENTIALS = "COROS_CREDENTIALS",
	COROS_VALIDATED = "COROS_VALIDATED",
	COROS_LAST_SYNC = "COROS_LAST_SYNC",
	GARMIN_VALIDATED = "GARMIN_VALIDATED",
	GARMIN_CREDENTIALS = "GARMIN_CREDENTIALS",
	GARMIN_LAST_SYNC = "GARMIN_LAST_SYNC",
	DOWNLOAD_FOLDER = "DOWNLOAD_FOLDER",
	OBSIDIAN_FOLDER = "OBSIDIAN_FOLDER",
	OBSIDIAN_DISABLED = "OBSIDIAN_DISABLED",
}
