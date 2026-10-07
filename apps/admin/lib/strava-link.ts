import db from "@/lib/db";
import { and, eq, profiles } from "@repo/db";
import { Providers } from "@repo/types";

type StravaToken = {
	token_type: string;
	expires_at: number;
	refresh_token: string;
	access_token: string;
};

/**
 * Stores Strava tokens for the signed-in user. A Strava athlete can only be
 * linked to one account: if another account already holds this athlete id the
 * link is refused and nothing is written.
 */
export async function linkStravaAthlete(
	userId: string,
	athleteId: string,
	token: StravaToken,
): Promise<boolean> {
	const holder = await db
		.select({ id: profiles.id })
		.from(profiles)
		.where(eq(profiles.externalId, athleteId))
		.limit(1);
	if (holder[0]?.id && holder[0].id !== userId) {
		return false;
	}

	const own = await db
		.select({ id: profiles.id })
		.from(profiles)
		.where(
			and(eq(profiles.id, userId), eq(profiles.provider, Providers.STRAVA)),
		)
		.limit(1);
	const values = {
		externalId: athleteId,
		tokenType: token.token_type,
		expiresAt: token.expires_at,
		refreshToken: token.refresh_token,
		accessToken: token.access_token,
	};
	if (own[0]) {
		await db.update(profiles).set(values).where(eq(profiles.id, userId));
	} else {
		await db.insert(profiles).values({
			id: userId,
			provider: Providers.STRAVA,
			...values,
		});
	}
	return true;
}
