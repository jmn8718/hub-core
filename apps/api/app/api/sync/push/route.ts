import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import type { ISyncPushPayload } from "@repo/types";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function POST(req: NextRequest): Promise<Response> {
	const authContext = await requireUser(req);
	if (!authContext) {
		return NextResponse.json(
			{ success: false, error: "Unauthorized" },
			{ status: 401 },
		);
	}

	let payload: ISyncPushPayload | null = null;
	try {
		payload = (await req.json()) as ISyncPushPayload;
	} catch {
		payload = null;
	}

	if (!payload) {
		return NextResponse.json(
			{ success: false, error: "Missing sync payload" },
			{ status: 400 },
		);
	}

	try {
		const data = await db.pushSyncRows({
			userId: authContext.internalUserId,
			syncSessionId: payload.syncSessionId,
			table: payload.table,
			batchIndex: payload.batchIndex,
			rows: payload.rows,
		});
		return NextResponse.json({
			success: true,
			...data,
		});
	} catch (error) {
		return NextResponse.json(
			{ success: false, error: (error as Error).message },
			{ status: 500 },
		);
	}
}
