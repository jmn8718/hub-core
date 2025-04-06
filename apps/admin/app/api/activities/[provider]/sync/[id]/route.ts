import { provider } from "@/lib/provider";
import type { Providers } from "@repo/types";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(
	_req: NextRequest,
	{ params }: { params: Promise<{ id: string; provider: Providers }> },
) {
	const supabase = createRouteHandlerClient({ cookies });
	const {
		data: { session },
	} = await supabase.auth.getSession();

	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { provider: providerId, id: activityId } = await params;
	const result = await provider.syncActivity(providerId, activityId);

	if (result) {
		return NextResponse.json({ success: true, id: result });
	}
	return NextResponse.json({ success: false });
}
