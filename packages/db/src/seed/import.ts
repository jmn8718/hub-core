import "dotenv/config";
import { ActivityType, GearType } from "@repo/types";
import { uuidv7 } from "uuidv7";
import { createDbClient } from "../client.js";
import {
	activities,
	activitiesConnection,
	activityGears,
	gears,
	gearsConnection,
	providerActivities,
	providerGears,
} from "../schemas/app.js";

import activitiesDbData from "./data/activities.json";
import activitiesConnectionDbData from "./data/activities_connection.json";
import activityGearsDbData from "./data/activity_gear.json";
import gearsDbData from "./data/gear.json";
import gearsConnectionDbData from "./data/gear_connection.json";
import providerActivitiesDbData from "./data/provider_activities.json";
import providerGearsDbData from "./data/provider_gear.json";

async function run() {
	const client = createDbClient(
		process.env.LOCAL_DB
			? {
					url: process.env.LOCAL_DB,
					logger: false,
				}
			: {
					url: process.env.TURSO_DATABASE_URL,
					authToken: process.env.TURSO_AUTH_TOKEN,
					logger: false,
				},
	);

	const activitiesId: Record<string, string> = {};
	const gearsId: Record<string, string> = {};

	const result11 = await client.delete(activitiesConnection);
	const result12 = await client.delete(gearsConnection);
	const result13 = await client.delete(activityGears);
	const result2 = await client.delete(gears);
	const result3 = await client.delete(activities);
	const result4 = await client.delete(providerActivities);
	const result5 = await client.delete(providerGears);
	console.log({
		result11: result11.rowsAffected,
		result12: result12.rowsAffected,
		result13: result13.rowsAffected,
		result2: result2.rowsAffected,
		result3: result3.rowsAffected,
		result4: result4.rowsAffected,
		result5: result5.rowsAffected,
	});
	const activitiesData = await client.insert(activities).values(
		activitiesDbData.data.map((data) => {
			const id = uuidv7();
			activitiesId[data.id] = id;
			return {
				id,
				name: data.name,
				timestamp: data.timestamp,
				distance: data.distance || 0,
				duration: data.duration || 0,
				manufacturer: data.manufacturer || "",
				locationName: data.location_name || "",
				locationCountry: "",
				type: ActivityType.RUN,
				is_event: data.is_race || 0,
				startLatitude: data.start_latitude || 0,
				startLongitude: data.start_longitude || 0,
				notes: data.notes || "",
			};
		}),
	);
	const gearsData = await client.insert(gears).values(
		gearsDbData.data.map((data) => {
			const id = uuidv7();
			gearsId[data.id] = id;
			return {
				id,
				name: data.name,
				code: data.code,
				brand: data.type === "insole" ? "sidas" : data.brand,
				type: data.type === "insole" ? GearType.INSOLE : GearType.SHOES,
				dateBegin: data.date_begin,
				dateEnd: data.date_end,
				maximumDistance: data.maximum_distance,
			};
		}),
	);

	const activityGearsData = await client.insert(activityGears).values(
		activityGearsDbData.data.map((data) => {
			const gearId = gearsId[data.gear_id];
			const activityId = activitiesId[data.activity_id];
			if (!activityId || !gearId) {
				console.log({
					gearId,
					activityId,
					data,
				});
				throw new Error("no id related");
			}
			return {
				gearId,
				activityId,
			};
		}),
	);

	const providerGearsData = await client.insert(providerGears).values(
		providerGearsDbData.data.map((data) => {
			const id = uuidv7();
			gearsId[data.id] = id;
			return {
				id,
				provider: data.provider,
				providerId: data.provider_id,
				data: data.data,
			};
		}),
	);

	const providerConnectionGearData = await client
		.insert(gearsConnection)
		.values(
			gearsConnectionDbData.data.map((data) => {
				const gearId = gearsId[data.gear_id];
				const providerGearId = gearsId[data.provider_gear_id];
				if (!gearId || !providerGearId) {
					console.log({
						providerGearId,
						gearId,
						data,
					});
					throw new Error("no id related");
				}
				return {
					gearId,
					providerGearId,
				};
			}),
		);

	const providerActivityData = await client
		.insert(providerActivities)
		// @ts-expect-error
		.values(
			providerActivitiesDbData.data.map((data) => {
				activitiesId[data.id] = data.id.toString();
				return {
					id: data.id.toString(),
					provider: data.provider,
					timestamp: data.timestamp,
					original: data.original,
					data: data.data,
				};
			}),
		);

	const providerConnectionActivityData = await client
		.insert(activitiesConnection)
		.values(
			activitiesConnectionDbData.data.map((data, index) => {
				const activityId = activitiesId[data.activity_id];
				const providerActivityId = activitiesId[data.provider_activity_id];
				if (!activityId || !providerActivityId) {
					console.log({
						index,
						providerActivityId,
						activityId,
						data,
					});
					throw new Error("no id related");
				}
				return {
					activityId,
					providerActivityId,
				};
			}),
		);

	console.log({
		activitiesData: activitiesData.rowsAffected,
		gearsData: gearsData.rowsAffected,
		activityGearsData: activityGearsData.rowsAffected,
		providerGearsData: providerGearsData.rowsAffected,
		providerConnectionGearData: providerConnectionGearData.rowsAffected,
		providerActivityData: providerActivityData.rowsAffected,
		providerConnectionActivityData: providerConnectionActivityData.rowsAffected,
	});
}

run().then(() => {
	console.log("Seeding complete.");
});
