import { StravaAuthorization } from "@/components/strava-authorize";
import db from "@/lib/db";
import { eq, profiles } from "@repo/db";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function AccountPage() {
	const supabase = createServerComponentClient({ cookies });
	const {
		data: { session },
	} = await supabase.auth.getSession();
	const profile = await db
		.select({
			id: profiles.id,
		})
		.from(profiles)
		.where(eq(profiles.id, session?.user.id || "x"))
		.limit(1);

	if (profile[0]) {
		return redirect("/account");
	}
	return <StravaAuthorization />;
}
