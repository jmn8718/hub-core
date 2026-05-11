import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function GET(req: NextRequest): Promise<Response> {
	const authContext = await requireUser(req);
	if (!authContext) {
		return NextResponse.json(
			{ success: false, error: "Unauthorized" },
			{ status: 401 },
		);
	}

	const syncSessionId = req.nextUrl.searchParams.get("id");
	if (!syncSessionId) {
		return NextResponse.json(
			{ success: false, error: "Missing sync session id" },
			{ status: 400 },
		);
	}

	try {
		const data = await db.getSyncSessionStatus({
			userId: authContext.user.id,
			syncSessionId,
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
