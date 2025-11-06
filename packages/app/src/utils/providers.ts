import { Providers } from "@repo/types";

const GARMIN_ACTIVITY_URL = (activityId: string) =>
	`https://connect.garmin.com/modern/activity/${activityId}`;
const COROS_ACTIVITY_URL = (activityId: string) =>
	`https://training.coros.com/activity-detail?labelId=${activityId}&sportType=100`;
const STRAVA_ACTIVITY_URL = (activityId: string) =>
	`https://www.strava.com/activities/${activityId}`;

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
