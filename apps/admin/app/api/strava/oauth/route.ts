import db from "@/lib/db";
import StravaClient from "@/lib/strava";
import { eq, profiles } from "@repo/db";
import { Providers } from "@repo/types";
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
	const stravaClient = new StravaClient(db);

	const { code } = await req.json();
	const token = await stravaClient.client.oauth.getToken(code);
	const users = await db
		.select({ id: profiles.id })
		.from(profiles)
		.where(eq(profiles.externalId, token.athlete.id.toString()))
		.limit(1);
	if (users[0]?.id) {
		await db
			.update(profiles)
			.set({
				expiresAt: token.expires_at,
				refreshToken: token.refresh_token,
				accessToken: token.access_token,
			})
			.where(eq(profiles.id, users[0].id));
	} else {
		await db.insert(profiles).values({
			id: session.user.id,
			externalId: token.athlete.id.toString(),
			tokenType: token.token_type,
			expiresAt: token.expires_at,
			refreshToken: token.refresh_token,
			accessToken: token.access_token,
			provider: Providers.STRAVA,
		});
	}
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
	const stravaClient = new StravaClient(db);

	const url = await stravaClient.client.oauth.getRequestAccessURL({
		scope:
			"read,read_all,activity:write,activity:read_all,profile:write,profile:read_all",
	});

	return NextResponse.json({
		url,
	});
}
