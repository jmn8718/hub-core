import { requireUser } from "@/lib/auth";
import { handleClientAction } from "@/lib/client-actions";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function POST(
	req: NextRequest,
	{ params }: { params: Promise<{ action: string }> },
) {
	const authContext = await requireUser(req);
	if (!authContext) {
		return NextResponse.json(
			{ success: false, error: "Unauthorized" },
			{ status: 401 },
		);
	}
	const { action } = await params;
	if (!action) {
		return NextResponse.json(
			{ success: false, error: "Missing action" },
			{ status: 400 },
		);
	}

	let payload: Record<string, unknown> | undefined;
	try {
		payload = await req.json();
	} catch {
		payload = {};
	}

	try {
		const result = await handleClientAction(action, payload);
		return NextResponse.json(result);
	} catch (error) {
		return NextResponse.json(
			{
				success: false,
				error: (error as Error).message,
			},
			{ status: 400 },
		);
	}
}
