import db from "@/lib/db";
import StravaClient from "@/lib/strava";
import { eq, profiles } from "@repo/db";
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

	const userId = session.user.id;
	const stravaClient = new StravaClient(db);

	const athlete = await stravaClient.getAthlete(userId);

	return NextResponse.json(athlete);
}

export async function DELETE(_req: NextRequest) {
	const supabase = createRouteHandlerClient({ cookies });
	const {
		data: { session },
	} = await supabase.auth.getSession();

	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	await db.delete(profiles).where(eq(profiles.id, session.user.id));

	return NextResponse.json({ success: true });
}
