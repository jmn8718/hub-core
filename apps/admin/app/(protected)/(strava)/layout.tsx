import db from "@/lib/db";
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
	const count = await db.$count(profiles, eq(profiles.id, userId));

	if (count === 0) {
		return redirect("/authorize");
	}
	return children;
}
