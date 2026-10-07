import db from "@/lib/db";
import StravaClient from "@/lib/strava";
import { linkStravaAthlete } from "@/lib/strava-link";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
	const supabase = createRouteHandlerClient({ cookies });
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}
	const stravaClient = new StravaClient(db);

	const { code } = (await req.json()) as { code?: string };
	if (!code || typeof code !== "string") {
		return NextResponse.json({ error: "Missing code" }, { status: 400 });
	}
	const token = await stravaClient.client.oauth.getToken(code);
	const athleteId = token.athlete.id.toString();
	const linked = await linkStravaAthlete(user.id, athleteId, token);
	if (!linked) {
		return NextResponse.json(
			{ error: "This Strava athlete is already linked to another account" },
			{ status: 409 },
		);
	}
	// Tokens stay server-side; the browser only needs to know it worked.
	return NextResponse.json({
		athleteId,
		expiresAt: token.expires_at,
	});
}

export async function GET(req: NextRequest) {
	const supabase = createRouteHandlerClient({ cookies });
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}
	const stravaClient = new StravaClient(db);

	const url = await stravaClient.client.oauth.getRequestAccessURL({
		scope:
			"read,read_all,activity:write,activity:read_all,profile:write,profile:read_all",
	});

	return NextResponse.json({
		url,
	});
}
