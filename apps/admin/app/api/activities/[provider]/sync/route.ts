import { getProvider } from "@/lib/provider";
import type { Providers } from "@repo/types";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(
	_req: NextRequest,
	{ params }: { params: Promise<{ provider: Providers }> },
) {
	const supabase = createRouteHandlerClient({ cookies });
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const { provider: providerId } = await params;
		const provider = await getProvider();
		await provider.sync(providerId);
		return NextResponse.json({ success: true });
	} catch (error) {
		console.error(error);
		return NextResponse.json(
			{
				success: false,
				error: (error as Error).message,
			},
			{ status: 500 },
		);
	}
}
