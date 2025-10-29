import "dotenv/config";
import { uuidv7 } from "uuidv7";
import { type DbClient, createDbClient } from "../client.js";
import { inbodyData } from "../mocks/inbody.js";
import { weightData } from "../mocks/weight.js";
import { inbody, weight } from "../schemas/index.js";

function clearData(client: DbClient) {
	return Promise.all([client.delete(inbody), client.delete(weight)]);
}

function importInbodyData(client: DbClient, data: typeof inbodyData) {
	return client.insert(inbody).values(
		data.map((data) => ({
			id: uuidv7(),
			type: data.type,
			date: data.date,
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
		})),
	);
}

function importWeightData(client: DbClient, data: typeof weightData) {
	return client.insert(weight).values(
		data.map((record) => ({
			id: uuidv7(),
			weight: record.weight,
			date: record.date,
		})),
	);
}

async function run() {
	const client = createDbClient(
		process.env.LOCAL_DB
			? {
					url: process.env.LOCAL_DB,
				}
			: {
					url: process.env.TURSO_DATABASE_URL,
					authToken: process.env.TURSO_AUTH_TOKEN,
					logger: false,
				},
	);

	await clearData(client);
	console.log("--- db cleared");
	await importInbodyData(client, inbodyData);
	console.log("--- db inbody data imported");
	await importWeightData(client, weightData);
	console.log("--- db weight data imported");
}

run().then(() => {
	console.log("Seeding complete.");
});
