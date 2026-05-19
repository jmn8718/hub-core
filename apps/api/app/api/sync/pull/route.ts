import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import type { ISyncPullPayload } from "@repo/types";
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

	let payload: ISyncPullPayload | null = null;
	try {
		payload = (await req.json()) as ISyncPullPayload;
	} catch {
		payload = null;
	}

	if (!payload?.syncSessionId) {
		return NextResponse.json(
			{ success: false, error: "Missing sync session id" },
			{ status: 400 },
		);
	}

	try {
		const data = await db.pullSyncRows({
			userId: authContext.internalUserId,
			syncSessionId: payload.syncSessionId,
			table: payload.table,
			limit: payload.limit,
			offset: payload.offset,
			updatedAfter: payload.updatedAfter,
		});
		return NextResponse.json({
			success: true,
			data,
		});
	} catch (error) {
		return NextResponse.json(
			{ success: false, error: (error as Error).message },
			{ status: 500 },
		);
	}
}
