import type { IInsertActivityPayload, IInsertGearPayload } from "@repo/db";
import type { DbActivityPopulated } from "@repo/types";

export abstract class Client {
	abstract connect(params: {
		username: string;
		password: string;
	}): Promise<void>;

	abstract sync(params: {
		id?: string;
		lastTimestamp?: number;
	}): Promise<IInsertActivityPayload[]>;

	abstract syncActivity(activityId: string): Promise<IInsertActivityPayload>;

	abstract syncGears(): Promise<IInsertGearPayload[]>;
	abstract linkActivityGear(activityId: string, gearId: string): Promise<void>;
	abstract unlinkActivityGear(
		activityId: string,
		gearId: string,
	): Promise<void>;

	abstract getActivity(id: string): Promise<unknown>;

	abstract createManualActivity(data: DbActivityPopulated): Promise<string>;
}
