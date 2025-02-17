import { StravaSubscriptionsList } from "@/components/strava-subscriptions-list";
import { StravaSubscriptionsNew } from "@/components/strava-subscriptions-new";

export default async function SubscriptionsPage() {
  return (
    <>
      <h1 className="text-2xl font-bold mb-4">Strava Subscriptions</h1>
      <StravaSubscriptionsList />
      <div className="my-4"></div>
      <StravaSubscriptionsNew />
    </>
  );
}
