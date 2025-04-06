import type { IInsertActivityPayload } from "@repo/db";

export abstract class Client {
	abstract connect(params: {
		username: string;
		password: string;
	}): Promise<void>;

	abstract sync(lastTimestamp?: string): Promise<IInsertActivityPayload[]>;

	abstract syncActivity(activityId: string): Promise<IInsertActivityPayload>;

	abstract getActivity(id: string): Promise<unknown>;
}
