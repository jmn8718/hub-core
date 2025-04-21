import type { IInsertActivityPayload, IInsertGearPayload } from "@repo/db";

export abstract class Client {
	abstract connect(params: {
		username: string;
		password: string;
	}): Promise<void>;

	abstract sync(params: {
		id?: string;
		lastTimestamp?: string;
	}): Promise<IInsertActivityPayload[]>;

	abstract syncActivity(activityId: string): Promise<IInsertActivityPayload>;

	abstract syncGears(): Promise<IInsertGearPayload[]>;
	abstract linkActivityGear(activityId: string, gearId: string): Promise<void>;
	abstract unlinkActivityGear(
		activityId: string,
		gearId: string,
	): Promise<void>;

	abstract getActivity(id: string): Promise<unknown>;
}
