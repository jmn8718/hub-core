import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui";
import { StravaSubscriptionDelete } from "./strava-subscription-delete-button";
import { ListPushSubscriptionResponse } from "strava-v3";

export async function StravaSubscriptionsList({
  subscriptions,
}: {
  subscriptions: ListPushSubscriptionResponse[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Subscriptions</CardTitle>
      </CardHeader>
      <CardContent>
        {subscriptions.length === 0 ? (
          <p>No active subscriptions</p>
        ) : (
          <ul>
            {subscriptions.map((sub) => (
              <li
                key={sub.id}
                className="flex justify-between items-center mb-2"
              >
                <span>{sub.callback_url}</span>
                <StravaSubscriptionDelete id={sub.id} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
