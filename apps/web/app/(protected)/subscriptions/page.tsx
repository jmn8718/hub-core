import { StravaSubscriptionsList } from "@/components/strava-subscriptions-list";
import { StravaSubscriptionsNew } from "@/components/strava-subscriptions-new";
import strava from "@/lib/strava";

export default async function SubscriptionsPage() {
  const subscriptions = await strava.pushSubscriptions.list();

  return subscriptions.length > 0 ? (
    <StravaSubscriptionsList subscriptions={subscriptions} />
  ) : (
    <StravaSubscriptionsNew />
  );
}
