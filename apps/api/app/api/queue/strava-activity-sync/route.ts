import { syncStravaActivitiesForExternalId } from "@/lib/providers";
import { handleStravaActivitySyncCallback } from "@/lib/queue";

export const runtime = "nodejs";

export const POST = handleStravaActivitySyncCallback(
	async (message) => {
		const synced = await syncStravaActivitiesForExternalId(message.ownerId);
		if (!synced) {
			console.log(
				`Skipping Strava activity sync for owner ${message.ownerId}: no stored token`,
			);
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
