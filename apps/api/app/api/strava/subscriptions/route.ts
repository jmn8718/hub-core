import { requireUser } from "@/lib/auth";
import type { StravaPushSubscription } from "@repo/types";
import { type NextRequest, NextResponse } from "next/server";

type RawStravaSubscription = {
	id: number;
	callback_url: string;
	created_at?: string;
	updated_at?: string;
};

const STRAVA_API_BASE_URL = "https://www.strava.com/api/v3/push_subscriptions";

async function requestStravaSubscriptions<T>(
	path: string,
	init?: RequestInit,
): Promise<T> {
	const url = `${STRAVA_API_BASE_URL}${path}`;
	const response = await fetch(url, init);
	if (!response.ok) {
		const body = await response.text().catch(() => "");
		console.error("Strava subscriptions request failed", {
			url,
			method: init?.method ?? "GET",
			status: response.status,
			body,
		});
		throw new Error(
			body || `Strava request failed with status ${response.status}`,
		);
	}

	return (await response.json()) as T;
}

function normalizeSubscription(
	subscription: RawStravaSubscription,
): StravaPushSubscription {
	return {
		id: subscription.id,
		callbackUrl: subscription.callback_url,
		createdAt: subscription.created_at,
		updatedAt: subscription.updated_at,
	};
}

export async function GET(req: NextRequest): Promise<Response> {
	const authContext = await requireUser(req);
	if (!authContext) {
		return NextResponse.json(
			{ success: false, error: "Unauthorized" },
			{ status: 401 },
		);
	}

	try {
		const query = new URLSearchParams({
			client_id: process.env.STRAVA_CLIENT_ID,
			client_secret: process.env.STRAVA_CLIENT_SECRET,
		});
		const subscriptions = (
			await requestStravaSubscriptions<RawStravaSubscription[]>(
				`?${query.toString()}`,
			)
		).map((subscription) => normalizeSubscription(subscription));
		return NextResponse.json({
			success: true,
			data: subscriptions,
		});
	} catch (error) {
		return NextResponse.json(
			{ success: false, error: (error as Error).message },
			{ status: 500 },
		);
	}
}

export async function POST(req: NextRequest): Promise<Response> {
	const authContext = await requireUser(req);
	if (!authContext) {
		return NextResponse.json(
			{ success: false, error: "Unauthorized" },
			{ status: 401 },
		);
	}

	let callbackUrl = "";
	try {
		const payload = (await req.json()) as { callbackUrl?: string };
		callbackUrl = payload.callbackUrl?.trim() ?? "";
	} catch {
		callbackUrl = "";
	}

	if (!callbackUrl) {
		return NextResponse.json(
			{ success: false, error: "Missing callback URL" },
			{ status: 400 },
		);
	}

	try {
		const body = new URLSearchParams({
			callback_url: callbackUrl,
			verify_token: process.env.STRAVA_VERIFY_TOKEN,
			client_id: process.env.STRAVA_CLIENT_ID,
			client_secret: process.env.STRAVA_CLIENT_SECRET,
		});
		const subscription = normalizeSubscription(
			await requestStravaSubscriptions<RawStravaSubscription>("", {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: body.toString(),
			}),
		);
		return NextResponse.json({
			success: true,
			data: subscription,
		});
	} catch (error) {
		return NextResponse.json(
			{ success: false, error: (error as Error).message },
			{ status: 500 },
		);
	}
}

export async function DELETE(req: NextRequest): Promise<Response> {
	const authContext = await requireUser(req);
	if (!authContext) {
		return NextResponse.json(
			{ success: false, error: "Unauthorized" },
			{ status: 401 },
		);
	}

	let subscriptionId: number | null = null;
	try {
		const payload = (await req.json()) as { id?: number };
		subscriptionId =
			typeof payload.id === "number" && Number.isFinite(payload.id)
				? payload.id
				: null;
	} catch {
		subscriptionId = null;
	}

	if (!subscriptionId) {
		return NextResponse.json(
			{ success: false, error: "Missing subscription id" },
			{ status: 400 },
		);
	}

	try {
		const query = new URLSearchParams({
			client_id: process.env.STRAVA_CLIENT_ID,
			client_secret: process.env.STRAVA_CLIENT_SECRET,
		});
		await requestStravaSubscriptions<void>(`/${subscriptionId}?${query}`, {
			method: "DELETE",
		});
		return NextResponse.json({ success: true });
	} catch (error) {
		return NextResponse.json(
			{ success: false, error: (error as Error).message },
			{ status: 500 },
		);
	}
}
