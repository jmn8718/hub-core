import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
	CLOUD_SYNC_SCHEMA_VERSION,
	type ISyncValidateData,
	type ISyncValidatePayload,
} from "@repo/types";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function sameOrderedValues(left: string[], right: string[]) {
	return (
		left.length === right.length &&
		left.every((value, index) => value === right[index])
	);
}

export async function POST(req: NextRequest): Promise<Response> {
	const authContext = await requireUser(req);
	if (!authContext) {
		return NextResponse.json(
			{ success: false, error: "Unauthorized" },
			{ status: 401 },
		);
	}

	let payload: ISyncValidatePayload | null = null;
	try {
		payload = (await req.json()) as ISyncValidatePayload;
	} catch {
		payload = null;
	}

	if (!payload) {
		return NextResponse.json(
			{ success: false, error: "Missing validation payload" },
			{ status: 400 },
		);
	}

	const serverTables = db.getSyncTables();
	const serverBatchLimit = db.getSyncBatchLimit();
	const reasons: string[] = [];

	if (payload.schemaVersion !== CLOUD_SYNC_SCHEMA_VERSION) {
		reasons.push(
			`Schema version mismatch: desktop=${payload.schemaVersion}, server=${CLOUD_SYNC_SCHEMA_VERSION}`,
		);
	}

	if (!sameOrderedValues(payload.tables, serverTables)) {
		reasons.push(
			`Sync tables mismatch: desktop=${payload.tables.join(",")}, server=${serverTables.join(",")}`,
		);
	}

	if (payload.batchLimit !== serverBatchLimit) {
		reasons.push(
			`Batch limit mismatch: desktop=${payload.batchLimit}, server=${serverBatchLimit}`,
		);
	}

	const data: ISyncValidateData = {
		compatible: reasons.length === 0,
		userId: authContext.internalUserId,
		reasons,
		clientId: payload.clientId ?? "desktop",
		clientSchemaVersion: payload.schemaVersion,
		clientTables: payload.tables,
		clientBatchLimit: payload.batchLimit,
		serverSchemaVersion: CLOUD_SYNC_SCHEMA_VERSION,
		serverTables,
		serverBatchLimit,
	};

	return NextResponse.json({
		success: true,
		data,
	});
}
