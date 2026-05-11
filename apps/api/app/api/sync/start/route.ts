import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import type { ISyncStartPayload } from "@repo/types";
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

	let payload: ISyncStartPayload = {};
	try {
		payload = (await req.json()) as ISyncStartPayload;
	} catch {
		payload = {};
	}

	try {
		const data = await db.createSyncSession({
			userId: authContext.user.id,
			clientId: payload.clientId,
			schemaVersion: payload.schemaVersion,
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
