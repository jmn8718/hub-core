import { StravaSubscriptionsList } from "@/components/strava-subscriptions-list";
import { StravaSubscriptionsNew } from "@/components/strava-subscriptions-new";
import db from "@/lib/db";
import StravaClient from "@/lib/strava";

export default async function SubscriptionsPage() {
	const stravaClient = new StravaClient(db);
	const subscriptions = await stravaClient.client.pushSubscriptions.list();
	return subscriptions.length > 0 ? (
		<StravaSubscriptionsList subscriptions={subscriptions} />
	) : (
		<StravaSubscriptionsNew />
	);
}
