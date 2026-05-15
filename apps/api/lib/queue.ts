import { handleCallback, send } from "@vercel/queue";

export const STRAVA_ACTIVITY_SYNC_TOPIC = "strava-activity-sync";

export type StravaActivitySyncMessage = {
	ownerId: string;
	objectId: string;
	aspectType: string;
	eventTime: number;
	subscriptionId: string;
};

export async function enqueueStravaActivitySync(
	message: StravaActivitySyncMessage,
) {
	return send(STRAVA_ACTIVITY_SYNC_TOPIC, message, {
		idempotencyKey: [
			STRAVA_ACTIVITY_SYNC_TOPIC,
			message.ownerId,
			message.objectId,
			message.aspectType,
			message.eventTime.toString(),
		].join(":"),
	});
}

export const handleStravaActivitySyncCallback =
	handleCallback<StravaActivitySyncMessage>;
