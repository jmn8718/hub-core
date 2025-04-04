import db from "@/lib/db";
import strava from "@/lib/strava";
import { eq } from "@repo/db";
import { profiles } from "@repo/db";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	console.log(params);
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
	strava.client(auth[0].token);
	const { id } = await params;
	const activity = await strava.activities.get({ id });
	return NextResponse.json(activity);
}
