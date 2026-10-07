import { dbClient } from "@/lib/db";
import { enqueueStravaActivitySync } from "@/lib/queue";
import { and, eq, webhooks } from "@repo/db";
import { type NextRequest, NextResponse } from "next/server";

type StravaWebhookPayload = {
	aspect_type: string;
	event_time: number;
	object_id: number;
	object_type: string;
	owner_id: number;
	subscription_id: number;
	updates?: Record<string, unknown>;
};

export async function GET(req: NextRequest): Promise<Response> {
	const { searchParams } = new URL(req.url);
	const mode = searchParams.get("hub.mode");
	const token = searchParams.get("hub.verify_token");
	const challenge = searchParams.get("hub.challenge");

	if (mode === "subscribe" && token === process.env.STRAVA_VERIFY_TOKEN) {
		console.log("Webhook verified");
		return NextResponse.json({ "hub.challenge": challenge });
	}

	return NextResponse.json({ error: "Invalid token" }, { status: 403 });
}

function isWebhookPayload(value: unknown): value is StravaWebhookPayload {
	if (!value || typeof value !== "object") return false;
	const body = value as Record<string, unknown>;
	return (
		typeof body.aspect_type === "string" &&
		["create", "update", "delete"].includes(body.aspect_type) &&
		typeof body.object_type === "string" &&
		["activity", "athlete"].includes(body.object_type) &&
		Number.isInteger(body.object_id) &&
		Number.isInteger(body.owner_id) &&
		Number.isInteger(body.subscription_id) &&
		Number.isInteger(body.event_time)
	);
}

export async function POST(req: NextRequest): Promise<Response> {
	const body = await req.json().catch(() => null);
	if (!isWebhookPayload(body)) {
		return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
	}

	// Strava cannot sign webhooks; the subscription id is the only thing an
	// outsider does not know, so require it when configured.
	const expectedSubscriptionId = process.env.STRAVA_SUBSCRIPTION_ID;
	if (
		expectedSubscriptionId &&
		body.subscription_id.toString() !== expectedSubscriptionId
	) {
		return NextResponse.json(
			{ error: "Unknown subscription" },
			{ status: 403 },
		);
	}
	console.log("Received webhook", {
		objectType: body.object_type,
		objectId: body.object_id,
		aspectType: body.aspect_type,
	});

	try {
		const ownerId = body.owner_id.toString();
		const objectId = body.object_id.toString();
		const eventTime = new Date(body.event_time * 1000).toISOString();

		// De-duplicate on the whole event, not the object: update and delete
		// events for an activity must still be recorded after its create.
		const existing = await dbClient
			.select({ id: webhooks.id })
			.from(webhooks)
			.where(
				and(
					eq(webhooks.object_type, body.object_type),
					eq(webhooks.object_id, objectId),
					eq(webhooks.aspect_type, body.aspect_type),
					eq(webhooks.event_time, eventTime),
				),
			)
			.limit(1);
		if (existing.length > 0) {
			return NextResponse.json({ message: "Event already recorded" });
		}

		await dbClient.insert(webhooks).values({
			owner_id: ownerId,
			aspect_type: body.aspect_type,
			subscription_id: body.subscription_id.toString(),
			object_id: objectId,
			object_type: body.object_type,
			updates: JSON.stringify(body.updates || {}),
			event_time: eventTime,
			event: JSON.stringify(body),
		});

		if (body.object_type === "activity") {
			await enqueueStravaActivitySync({
				ownerId,
				objectId,
				aspectType: body.aspect_type,
				eventTime: body.event_time,
				subscriptionId: body.subscription_id.toString(),
			});
		}
	} catch (error) {
		console.error(error);
		return NextResponse.json(
			{ error: "Failed to store activity" },
			{ status: 500 },
		);
	}

	return NextResponse.json({ message: "Activity stored successfully" });
}
