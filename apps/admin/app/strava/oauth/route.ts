import db from "@/lib/db";
import strava from "@/lib/strava";
import { eq, profiles } from "@repo/db";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
	const supabase = createServerComponentClient({ cookies });
	const {
		data: { session },
	} = await supabase.auth.getSession();
	const requestUrl = new URL(request.url);
	const code = requestUrl.searchParams.get("code");
	let status = "error";
	let message = "";
	try {
		if (code) {
			const token = await strava.oauth.getToken(code);
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
					// biome-ignore lint/style/noNonNullAssertion: <explanation>
					id: session!.user.id,
					externalId: token.athlete.id.toString(),
					expiresAt: token.expires_at,
					refreshToken: token.refresh_token,
					accessToken: token.access_token,
					tokenType: token.token_type,
				});
			}
			status = "success";
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
