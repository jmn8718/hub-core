import db from "@/lib/db";
import strava from "@/lib/strava";
import { isAfter } from "@repo/dates";
import { eq, profiles } from "@repo/db";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function StravaLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const supabase = createServerComponentClient({ cookies });
	const {
		data: { session },
	} = await supabase.auth.getSession();
	const userId = session?.user.id || "x";
	const profile = await db
		.select({
			accessToken: profiles.accessToken,
			refreshToken: profiles.refreshToken,
			tokenType: profiles.tokenType,
			expiresAt: profiles.expiresAt,
		})
		.from(profiles)
		.where(eq(profiles.id, userId))
		.limit(1);

	if (!profile[0]) {
		return redirect("/authorize");
	}
	if (isAfter(new Date(profile[0].expiresAt * 1000), new Date())) {
		const refresh = await strava.client.oauth.refreshToken(
			profile[0].refreshToken,
		);
		strava.setToken(refresh.access_token);
		await db
			.update(profiles)
			.set({
				expiresAt: refresh.expires_at,
				refreshToken: refresh.refresh_token,
				accessToken: refresh.access_token,
				tokenType: refresh.token_type,
			})
			.where(eq(profiles.id, userId));
	} else {
		strava.setToken(profile[0].accessToken);
	}
	return children;
}
