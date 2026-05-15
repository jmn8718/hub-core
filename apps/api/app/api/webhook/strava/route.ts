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

export async function POST(req: NextRequest): Promise<Response> {
	const body = (await req.json()) as StravaWebhookPayload;
	console.log("Received webhook:", body);

	try {
		let recordEvent = true;
		const ownerId = body.owner_id.toString();

		if (body.object_type === "activity" && body.aspect_type === "create") {
			const result = await dbClient
				.select({ id: webhooks.id })
				.from(webhooks)
				.where(
					and(
						eq(webhooks.object_id, body.object_id.toString()),
						eq(webhooks.aspect_type, body.aspect_type),
					),
				)
				.limit(1);

			if (result.length === 1) {
				console.log(`Existing event for ${body.object_id}`);
				console.log(result);
				recordEvent = false;
			}
		}

		if (recordEvent) {
			await dbClient.insert(webhooks).values({
				owner_id: ownerId,
				aspect_type: body.aspect_type,
				subscription_id: body.subscription_id.toString(),
				object_id: body.object_id.toString(),
				object_type: body.object_type,
				updates: JSON.stringify(body.updates || {}),
				event_time: new Date(body.event_time * 1000).toISOString(),
				event: JSON.stringify(body),
			});
		}

		if (recordEvent && body.object_type === "activity") {
			await enqueueStravaActivitySync({
				ownerId,
				objectId: body.object_id.toString(),
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
