import db from "@/lib/db";
import strava from "@/lib/strava";
import { eq } from "@repo/db";
import { profiles } from "@repo/db";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest) {
	const supabase = createRouteHandlerClient({ cookies });
	const {
		data: { session },
	} = await supabase.auth.getSession();

	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const auth = await db
		.select({
			token: profiles.accessToken,
		})
		.from(profiles)
		.where(eq(profiles.id, session.user.id))
		.limit(1);

	if (!auth[0]?.token) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}
	const queryPage = _req.nextUrl.searchParams.get("page");
	const queryPerPage = _req.nextUrl.searchParams.get("per_page");
	const page = queryPage ? Number(queryPage) : 1;
	const per_page = queryPerPage ? Number(queryPerPage) : 25;

	strava.setToken(auth[0].token);
	const activities = await strava.getActivities({ per_page, page });
	return NextResponse.json(activities);
}
