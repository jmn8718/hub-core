export enum Providers {
	GARMIN = "GARMIN",
	COROS = "COROS",
	STRAVA = "STRAVA",
}

export enum FileExtensions {
	TCX = "tcx",
	FIT = "fit",
}

export enum AppType {
	WEB = "web",
	DESKTOP = "desktop",
}

export enum GearType {
	SHOES = "shoes",
	INSOLE = "insole",
	BIKE = "bike",
	OTHER = "other",
}

export enum ActivityType {
	RUN = "run",
	BIKE = "bike",
	GYM = "gym",
	CARDIO = "cardio",
	SWIM = "swim",
	HIKE = "hike",
	OTHER = "other",
}

export enum ActivitySubType {
	INDOOR = "indoor",
	EASY_RUN = "easy-run",
	TRAINING = "training",
	ROAD = "road",
	TRAIL = "trail",
}

export enum Channels {
	ACTIVITY_DOWNLOAD_FILE = "ACTIVITY_DOWNLOAD_FILE",
	ACTIVITY_EXPORT_MANUAL = "ACTIVITY_EXPORT_MANUAL",
	ACTIVITY_UPLOAD_FILE = "ACTIVITY_UPLOAD_FILE",
	FOLDER_GET = "FOLDER_GET",
	DB_ACTIVITIES = "DB_ACTIVITIES",
	DB_ACTIVITY = "DB_ACTIVITY",
	DB_ACTIVITY_EDIT = "DB_ACTIVITY_EDIT",
	DB_GEARS = "DB_GEARS",
	DB_GEAR = "DB_GEAR",
	DB_GEAR_EDIT = "DB_GEAR_EDIT",
	DB_OVERVIEW = "DB_OVERVIEW",
	FILE_EXISTS = "FILE_EXISTS",
	OPEN_LINK = "OPEN_LINK",
	PROVIDERS_SYNC = "PROVIDERS_SYNC",
	PROVIDERS_SYNC_GEAR = "PROVIDERS_SYNC_GEAR",
	PROVIDERS_CONNECT = "PROVIDERS_CONNECT",
	PROVIDERS_GEAR_LINK = "PROVIDERS_GEAR_LINK",
	PROVIDERS_GEAR_UNLINK = "PROVIDERS_GEAR_UNLINK",
	STORE_GET = "STORE_GET",
	STORE_SET = "STORE_SET",
}

export enum StorageKeys {
	// coros storage keys
	COROS_CREDENTIALS = "COROS_CREDENTIALS",
	COROS_VALIDATED = "COROS_VALIDATED",
	COROS_LAST_SYNC = "COROS_LAST_SYNC",
	// garmin storage keys
	GARMIN_VALIDATED = "GARMIN_VALIDATED",
	GARMIN_CREDENTIALS = "GARMIN_CREDENTIALS",
	GARMIN_LAST_SYNC = "GARMIN_LAST_SYNC",
	// garmin storage keys
	STRAVA_VALIDATED = "STRAVA_VALIDATED",
	STRAVA_CREDENTIALS = "STRAVA_CREDENTIALS",
	STRAVA_LAST_SYNC = "STRAVA_LAST_SYNC",
	// other options
	DOWNLOAD_FOLDER = "DOWNLOAD_FOLDER",
	OBSIDIAN_FOLDER = "OBSIDIAN_FOLDER",
	OBSIDIAN_DISABLED = "OBSIDIAN_DISABLED",
}
