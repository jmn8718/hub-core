import activitiesDbData from "./data/activities.json" with { type: "json" };
import activitiesConnectionDbData from "./data/activities_connection.json" with {
	type: "json",
};
import activityGearsDbData from "./data/activity_gear.json" with {
	type: "json",
};
import gearsDbData from "./data/gear.json" with { type: "json" };
import gearsConnectionDbData from "./data/gear_connection.json" with {
	type: "json",
};
import providerActivitiesDbData from "./data/provider_activities.json" with {
	type: "json",
};
import providerGearsDbData from "./data/provider_gear.json" with {
	type: "json",
};

export const data = {
	activitiesDbData: (
		activitiesDbData as {
			data: {
				id: string;
				name: string;
				timestamp: string;
				distance: number;
				duration: number;
				manufacturer: string;
				location_name: string;
				notes: string | null;
				type: string;
				start_latitude: number;
				start_longitude: number;
				is_race: "0" | "1" | null;
				subtype: string | null;
				is_event: "0" | "1" | null;
			}[];
		}
	).data,
	activitiesConnectionDbData: (
		activitiesConnectionDbData as {
			data: {
				activity_id: string;
				provider_activity_id: string;
			}[];
		}
	).data,
	activityGearsDbData: (
		activityGearsDbData as {
			data: {
				activity_id: string;
				gear_id: string;
			}[];
		}
	).data,
	gearsDbData: (
		gearsDbData as {
			data: {
				id: string;
				uuid: string | null;
				name: string;
				code: string;
				brand: string;
				type: string;
				date_begin: string;
				date_end: string | null;
				maximum_distance: string;
			}[];
		}
	).data,
	gearsConnectionDbData: (
		gearsConnectionDbData as {
			data: {
				gear_id: string;
				provider_gear_id: string;
			}[];
		}
	).data,
	providerActivitiesDbData: (
		providerActivitiesDbData as {
			data: {
				id: string;
				provider: string;
				timestamp: string;
				original: "0" | "1";
				data: string;
			}[];
		}
	).data,
	providerGearsDbData: (
		providerGearsDbData as {
			data: {
				id: string;
				provider: string;
				provider_id: string;
				data: string;
			}[];
		}
	).data,
};
