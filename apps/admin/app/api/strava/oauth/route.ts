import strava, { updateToken } from "@/lib/strava";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
	const supabase = createRouteHandlerClient({ cookies });
	const {
		data: { session },
	} = await supabase.auth.getSession();

	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { code } = await req.json();
	const token = await strava.oauth.getToken(code);
	await updateToken(token.access_token);
	return NextResponse.json({
		token,
	});
}

export async function GET(req: NextRequest) {
	const supabase = createRouteHandlerClient({ cookies });
	const {
		data: { session },
	} = await supabase.auth.getSession();

	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const url = await strava.oauth.getRequestAccessURL({
		scope: "activity:read_all",
	});

	return NextResponse.json({
		url,
	});
}
