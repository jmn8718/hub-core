import db from "@/lib/db";
import StravaClient from "@/lib/strava";
import { linkStravaAthlete } from "@/lib/strava-link";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
	const supabase = createServerComponentClient({ cookies });
	const {
		data: { user },
	} = await supabase.auth.getUser();
	const requestUrl = new URL(request.url);
	const code = requestUrl.searchParams.get("code");
	let status = "error";
	let message = "";
	try {
		if (!user) {
			return NextResponse.redirect(new URL("/login", request.url));
		}
		if (code) {
			const stravaClient = new StravaClient(db);
			const token = await stravaClient.client.oauth.getToken(code);
			const linked = await linkStravaAthlete(
				user.id,
				token.athlete.id.toString(),
				token,
			);
			if (linked) {
				status = "success";
			} else {
				message = "athlete_linked_to_another_account";
			}
		} else {
			message = "missing_code";
		}
	} catch (err) {
		console.error(err);
		message = (err as Error).message;
	}
	return NextResponse.redirect(
		new URL(`/account?status=${status}&message=${message}`, request.url),
	);
}
