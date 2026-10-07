import { dbClient } from "@/lib/db";
import {
	syncCorosActivitiesIfConfigured,
	syncStravaActivityForExternalId,
} from "@/lib/providers";
import {
	type StravaActivitySyncMessage,
	handleStravaActivitySyncCallback,
} from "@/lib/queue";
import { and, eq, webhooks } from "@repo/db";

async function isRecordedWebhookEvent(message: StravaActivitySyncMessage) {
	const rows = await dbClient
		.select({ id: webhooks.id })
		.from(webhooks)
		.where(
			and(
				eq(webhooks.owner_id, message.ownerId),
				eq(webhooks.object_id, message.objectId),
				eq(webhooks.aspect_type, message.aspectType),
				eq(
					webhooks.event_time,
					new Date(message.eventTime * 1000).toISOString(),
				),
			),
		)
		.limit(1);
	return rows.length > 0;
}

export const runtime = "nodejs";

export const POST = handleStravaActivitySyncCallback(
	async (message) => {
		// The callback route is public; trust only events the webhook route
		// stored, so a forged message cannot trigger provider work.
		const recorded = await isRecordedWebhookEvent(message);
		if (!recorded) {
			console.warn("Ignoring queue message without a recorded webhook", {
				ownerId: message.ownerId,
				objectId: message.objectId,
				aspectType: message.aspectType,
			});
			return;
		}

		if (message.aspectType === "delete") {
			console.log(
				`Strava activity ${message.objectId} deleted upstream; no local action`,
			);
			return;
		}

		const synced = await syncStravaActivityForExternalId(
			message.ownerId,
			message.objectId,
		);
		if (!synced) {
			console.log(
				`Skipping Strava activity sync for owner ${message.ownerId}: no stored token`,
			);
			return;
		}

		if (message.aspectType === "create") {
			const corosSynced = await syncCorosActivitiesIfConfigured();
			if (!corosSynced) {
				console.log(
					`Skipping COROS follow-up sync for Strava webhook owner ${message.ownerId}: COROS is not configured`,
				);
			}
		}
	},
	{
		visibilityTimeoutSeconds: 900,
		retry: (error, metadata) => {
			console.error("Strava activity sync queue handler failed", {
				error,
				messageId: metadata.messageId,
				deliveryCount: metadata.deliveryCount,
				topicName: metadata.topicName,
			});

			if (metadata.deliveryCount >= 10) {
				return { acknowledge: true };
			}

			return {
				afterSeconds: Math.min(900, 30 * metadata.deliveryCount),
			};
		},
	},
);
