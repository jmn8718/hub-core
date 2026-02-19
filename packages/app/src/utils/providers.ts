import { Providers } from "@repo/types";

const GARMIN_ACTIVITY_URL = (activityId: string) =>
	`https://connect.garmin.com/modern/activity/${activityId}`;
const COROS_ACTIVITY_URL = (activityId: string) =>
	`https://training.coros.com/activity-detail?labelId=${activityId}&sportType=100`;
const STRAVA_ACTIVITY_URL = (activityId: string) =>
	`https://www.strava.com/activities/${activityId}`;
const GARMIN_GEAR_URL = (gearId: string) =>
	`https://connect.garmin.com/modern/gear/${gearId}`;
const COROS_GEAR_URL = (gearId: string) =>
	`https://training.coros.com/gear-detail?gearId=${gearId}`;
const STRAVA_GEAR_URL = (gearId: string) =>
	`https://www.strava.com/gear/${gearId}`;

export const generateExternalLink = (
	provider: Providers,
	activityId: string,
) => {
	switch (provider) {
		case Providers.COROS:
			return COROS_ACTIVITY_URL(activityId);
		case Providers.GARMIN:
			return GARMIN_ACTIVITY_URL(activityId);
		case Providers.STRAVA:
			return STRAVA_ACTIVITY_URL(activityId);
		default:
			throw new Error(`Invalid provider ${provider}`);
	}
};

export const generateExternalGearLink = (
	provider: Providers,
	gearId: string,
) => {
	switch (provider) {
		case Providers.COROS:
			return COROS_GEAR_URL(gearId);
		case Providers.GARMIN:
			return GARMIN_GEAR_URL(gearId);
		case Providers.STRAVA:
			return STRAVA_GEAR_URL(gearId);
		default:
			throw new Error(`Invalid provider ${provider}`);
	}
};
