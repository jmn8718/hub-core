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
import { inbody } from "../schemas/inbody.js";

export function clearData(client: DbClient) {
	return Promise.all([
		client.delete(inbody),
		client.delete(activitiesConnection),
		client.delete(gearsConnection),
		client.delete(activityGears),
		client.delete(gears),
		client.delete(activities),
		client.delete(providerActivities),
		client.delete(providerGears),
	]);
}

function mapDevice(manufacturer = "") {
	if (manufacturer.toLowerCase().includes("coros")) return "COROS PACE 2";
	return manufacturer;
}

export async function importData(client: DbClient) {
	const activitiesId: Record<string, string> = {};
	const gearsId: Record<string, string> = {};

	const storedActivities: string[] = [];

	if (data.activitiesDbData.length > 0) {
		const activitiesData = await client.insert(activities).values(
			data.activitiesDbData.map((data) => {
				const id = uuidv7();
				activitiesId[data.id] = id;
				storedActivities.push(data.id);
				return {
					id,
					name: data.name,
					timestamp: new Date(data.timestamp).getTime(),
					distance: data.distance || 0,
					duration: data.duration || 0,
					manufacturer: data.manufacturer || "",
					device: mapDevice(data.manufacturer),
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
	}

	const extractBrandName = (name: string) => {
		const [brandName] = name.split(" ") as [string];
		return brandName.replace(/(?:^|\s|["'([{])+\S/g, (match) =>
			match.toUpperCase(),
		);
	};

	if (data.gearsDbData.length > 0) {
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
	}

	if (data.activityGearsDbData.length > 0) {
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
	}

	if (data.providerGearsDbData.length > 0) {
		const providerGearsData = await client.insert(providerGears).values(
			data.providerGearsDbData.map((data) => {
				gearsId[data.id] = data.id.toString();
				return {
					id: data.id.toString(),
					provider: data.provider,
					providerId: data.provider_id,
					data: data.data,
				};
			}),
		);
	}

	if (data.gearsConnectionDbData.length > 0) {
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
	}

	const storedProviderActivities = data.activitiesConnectionDbData.filter(
		(data) => storedActivities.includes(data.activity_id),
	);
	const storedProviderActivitiesIds = storedProviderActivities.map(
		({ provider_activity_id }) => provider_activity_id,
	);

	const providerActivitiesDbDataToInsert = data.providerActivitiesDbData.filter(
		(data) => storedProviderActivitiesIds.includes(data.id),
	);

	if (providerActivitiesDbDataToInsert.length > 0) {
		const providerActivityData = await client.insert(providerActivities).values(
			providerActivitiesDbDataToInsert.map((data) => {
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
	}

	if (storedProviderActivities.length > 0) {
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
	}

	// console.log({
	// 	activitiesData: activitiesData.rowsAffected,
	// 	gearsData: gearsData.rowsAffected,
	// 	activityGearsData: activityGearsData.rowsAffected,
	// 	providerGearsData: providerGearsData.rowsAffected,
	// 	providerConnectionGearData: providerConnectionGearData.rowsAffected,
	// 	providerActivityData: providerActivityData.rowsAffected,
	// 	providerConnectionActivityData: providerConnectionActivityData.rowsAffected,
	// });
}

const inbodyDbData = [
	{
		id: "1",
		weight: 7590,
		muscle_mass: 3480,
		body_fat_mass: 1450,
		bmi: 2400,
		percentage_body_fat: 1910,
		lean_core: 2610,
		lean_left_arm: 330,
		lean_right_arm: 322,
		lean_left_leg: 982,
		lean_right_leg: 993,
		fat_core: 740,
		fat_left_arm: 80,
		fat_right_arm: 80,
		fat_left_leg: 220,
		fat_right_leg: 230,
		composition_body_water: 4490,
		composition_protein: 5790,
		composition_minerals: 6140,
		composition_body_fat: 7590,
		type: "advanced",
		date: "2025-10-17T12:47:00Z",
	},
	{
		id: "2",
		weight: 7880,
		muscle_mass: 3610,
		body_fat_mass: 1550,
		bmi: 2490,
		percentage_body_fat: 1960,
		lean_core: 2710,
		lean_left_arm: 344,
		lean_right_arm: 342,
		lean_left_leg: 994,
		lean_right_leg: 1002,
		fat_core: 810,
		fat_left_arm: 80,
		fat_right_arm: 80,
		fat_left_leg: 230,
		fat_right_leg: 230,
		composition_body_water: 4630,
		composition_protein: 5970,
		composition_minerals: 6330,
		composition_body_fat: 7880,
		type: "advanced",
		date: "2025-07-11T11:05:00Z",
	},
	{
		id: "3",
		weight: 7970,
		muscle_mass: 3640,
		body_fat_mass: 1590,
		bmi: 2520,
		percentage_body_fat: 1990,
		lean_core: 2680,
		lean_left_arm: 339,
		lean_right_arm: 335,
		lean_left_leg: 1011,
		lean_right_leg: 1018,
		fat_core: 820,
		fat_left_arm: 80,
		fat_right_arm: 90,
		fat_left_leg: 240,
		fat_right_leg: 240,
		composition_body_water: 4660,
		composition_protein: 6000,
		composition_minerals: 6380,
		composition_body_fat: 7970,
		type: "advanced",
		date: "2025-04-17T09:34:00Z",
	},
	{
		id: "4",
		weight: 7900,
		muscle_mass: 3550,
		body_fat_mass: 1640,
		bmi: 2490,
		percentage_body_fat: 2070,
		lean_core: 2660,
		lean_left_arm: 337,
		lean_right_arm: 329,
		lean_left_leg: 979,
		lean_right_leg: 991,
		fat_core: 850,
		fat_left_arm: 90,
		fat_right_arm: 90,
		fat_left_leg: 250,
		fat_right_leg: 250,
		composition_body_water: 4570,
		composition_protein: 5880,
		composition_minerals: 6260,
		composition_body_fat: 7900,
		type: "advanced",
		date: "2025-04-04T10:35:00Z",
	},
];
export async function importInbodyData(client: DbClient) {
	if (inbodyDbData.length > 0) {
		const inbodyData = await client.insert(inbody).values(
			inbodyDbData.map((data) => ({
				id: data.id,
				weight: data.weight,
				muscleMass: data.muscle_mass,
				bodyFatMass: data.body_fat_mass,
				bmi: data.bmi,
				percentageBodyFat: data.percentage_body_fat,
				leanCore: data.lean_core,
				leanLeftArm: data.lean_left_arm,
				leanRightArm: data.lean_right_arm,
				leanLeftLeg: data.lean_left_leg,
				leanRightLeg: data.lean_right_leg,
				fatCore: data.fat_core,
				fatLeftArm: data.fat_left_arm,
				fatRightArm: data.fat_right_arm,
				fatLeftLeg: data.fat_left_leg,
				fatRightLeg: data.fat_right_leg,
				compositionBodyWater: data.composition_body_water,
				compositionProtein: data.composition_protein,
				compositionMinerals: data.composition_minerals,
				compositionBodyFat: data.composition_body_fat,
				type: data.type,
				date: data.date,
			})),
		);
	}
}
