import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { IInsertActivityPayload, IInsertGearPayload } from "@repo/db";
import type { DbActivityPopulated, FileExtensions } from "@repo/types";

export function generateActivityFilePath(
	downloadPath: string,
	folder: string,
	activityId: string,
	extension: FileExtensions,
) {
	const downloadFolderPath = join(downloadPath, folder);
	if (!existsSync(downloadFolderPath)) {
		mkdirSync(downloadFolderPath);
	}
	return join(downloadFolderPath, `${activityId}.${extension}`);
}

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
	abstract downloadActivity(
		activityId: string,
		downloadPath: string,
	): Promise<void>;
	abstract uploadActivity(filePath: string): Promise<string>;
	abstract generateActivityFilePath(
		downloadPath: string,
		activityId: string,
	): string;
}
