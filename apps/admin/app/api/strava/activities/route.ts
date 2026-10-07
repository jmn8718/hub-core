import db from "@/lib/db";
import StravaClient from "@/lib/strava";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest) {
	const supabase = createRouteHandlerClient({ cookies });
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const userId = user.id;
	const stravaClient = new StravaClient(db);

	const queryPage = _req.nextUrl.searchParams.get("page");
	const queryPerPage = _req.nextUrl.searchParams.get("per_page");
	const page = queryPage ? Number(queryPage) : 1;
	const per_page = queryPerPage ? Number(queryPerPage) : 25;

	const activities = await stravaClient.getActivities(userId, {
		per_page,
		page,
	});
	return NextResponse.json(activities);
}
