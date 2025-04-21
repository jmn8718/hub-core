// @ts-nocheck

import { ActivitySubType, ActivityType, GearType } from "@repo/types";
import { uuidv7 } from "uuidv7";
import type { DbClient } from "../client.js";
import {
	activities,
	activitiesConnection,
	activityGears,
	gears,
	gearsConnection,
	providerActivities,
	providerGears,
} from "../schemas/app.js";

import { data } from "../mocks/index.js";

export function clearData(client: DbClient) {
	return Promise.all([
		client.delete(activitiesConnection),
		client.delete(gearsConnection),
		client.delete(activityGears),
		client.delete(gears),
		client.delete(activities),
		client.delete(providerActivities),
		client.delete(providerGears),
	]);
}

export async function importData(client: DbClient) {
	const activitiesId: Record<string, string> = {};
	const gearsId: Record<string, string> = {};

	const storedActivities: string[] = [];

	const activitiesData = await client.insert(activities).values(
		data.activitiesDbData.map((data) => {
			const id = uuidv7();
			activitiesId[data.id] = id;
			storedActivities.push(data.id);
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
				subtype: data.is_event
					? ActivitySubType.ROAD
					: ActivitySubType.EASY_RUN,
				isEvent: data.is_event || 0,
				startLatitude: data.start_latitude || 0,
				startLongitude: data.start_longitude || 0,
				notes: data.notes || "",
			};
		}),
	);

	const extractBrandName = (name: string) => {
		const [brandName] = name.split(" ") as [string];
		return brandName.replace(/(?:^|\s|["'([{])+\S/g, (match) =>
			match.toUpperCase(),
		);
	};

	const gearsData = await client.insert(gears).values(
		data.gearsDbData.map((data) => {
			const id = uuidv7();
			gearsId[data.id] = id;
			return {
				id,
				name: data.name,
				code: data.code,
				brand: extractBrandName(data.name),
				type: data.type === "insole" ? GearType.INSOLE : GearType.SHOES,
				dateBegin: data.date_begin,
				dateEnd: data.date_end,
				maximumDistance: Number.parseInt(data.maximum_distance),
			};
		}),
	);

	const activityGearsData = await client.insert(activityGears).values(
		data.activityGearsDbData
			.filter((data) => storedActivities.includes(data.activity_id))
			.map((data) => {
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
		data.providerGearsDbData.map((data) => {
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
			data.gearsConnectionDbData.map((data) => {
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

	const storedProviderActivities = data.activitiesConnectionDbData.filter(
		(data) => storedActivities.includes(data.activity_id),
	);
	const storedProviderActivitiesIds = storedProviderActivities.map(
		({ provider_activity_id }) => provider_activity_id,
	);
	const providerActivityData = await client.insert(providerActivities).values(
		data.providerActivitiesDbData
			.filter((data) => storedProviderActivitiesIds.includes(data.id))
			.map((data) => {
				activitiesId[data.id] = data.id.toString();
				return {
					id: data.id.toString(),
					provider: data.provider,
					timestamp: data.timestamp,
					original: data.original === "1" ? 1 : 0,
					data: data.data,
				};
			}),
	);

	const providerConnectionActivityData = await client
		.insert(activitiesConnection)
		.values(
			storedProviderActivities.map((data, index) => {
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
