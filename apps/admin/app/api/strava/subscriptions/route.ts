import strava from "@/lib/strava";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
/* eslint-disable turbo/no-undeclared-env-vars */
import { type NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
	const supabase = createRouteHandlerClient({ cookies });
	const {
		data: { session },
	} = await supabase.auth.getSession();

	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { callbackUrl } = await req.json();

	try {
		const result = await strava.pushSubscriptions.create({
			callback_url: callbackUrl,
			verify_token: process.env.STRAVA_VERIFY_TOKEN,
			client_id: process.env.STRAVA_CLIENT_ID,
			client_secret: process.env.STRAVA_CLIENT_SECRET,
		});
		return NextResponse.json(result);
	} catch (error) {
		console.error("Error creating subscription:", error);
		return NextResponse.json(
			{ error: "Failed to create subscription" },
			{ status: 500 },
		);
	}
}

export async function GET(req: NextRequest) {
	const supabase = createRouteHandlerClient({ cookies });
	const {
		data: { session },
	} = await supabase.auth.getSession();

	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const result = await strava.pushSubscriptions.list();
		return NextResponse.json(result);
	} catch (error) {
		console.error("Error fetching subscriptions:", error);
		return NextResponse.json(
			{ error: "Failed to fetch subscriptions" },
			{ status: 500 },
		);
	}
}

export async function DELETE(req: NextRequest) {
	const supabase = createRouteHandlerClient({ cookies });
	const {
		data: { session },
	} = await supabase.auth.getSession();

	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { id } = await req.json();

	try {
		await strava.pushSubscriptions.delete({
			id,
			client_id: process.env.STRAVA_CLIENT_ID,
			client_secret: process.env.STRAVA_CLIENT_SECRET,
		});

		return NextResponse.json({ message: "Subscription deleted successfully" });
	} catch (error) {
		console.error("Error deleting subscription:", error);
		return NextResponse.json(
			{ error: "Failed to delete subscription" },
			{ status: 500 },
		);
	}
}
