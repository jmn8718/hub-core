"use client";

import { Button } from "@repo/ui";

const API_PATH = "/api/strava/subscriptions";
export function StravaSubscriptionDelete({ id }: { id: number }) {
	const deleteSubscription = async (subscriptionId: number) => {
		const response = await fetch(API_PATH, {
			method: "DELETE",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ id: subscriptionId }),
		});
		const data = await response.json();
		console.log("Subscription deleted:", data);
		window.location.reload();
	};

	return (
		<Button variant="destructive" onClick={() => deleteSubscription(id)}>
			Delete
		</Button>
	);
}
