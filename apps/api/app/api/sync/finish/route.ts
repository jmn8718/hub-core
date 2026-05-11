import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import type { ISyncFinishPayload } from "@repo/types";
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

	let payload: ISyncFinishPayload | null = null;
	try {
		payload = (await req.json()) as ISyncFinishPayload;
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
		const data = await db.finishSyncSession({
			userId: authContext.user.id,
			syncSessionId: payload.syncSessionId,
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
