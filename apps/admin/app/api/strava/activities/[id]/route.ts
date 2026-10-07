import db from "@/lib/db";
import StravaClient from "@/lib/strava";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(
	_req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const supabase = createRouteHandlerClient({ cookies });
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const userId = user.id;
	const stravaClient = new StravaClient(db);

	const { id } = await params;
	const activity = await stravaClient.getActivityById(userId, id);
	return NextResponse.json(activity);
}
