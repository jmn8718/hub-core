"use client";

import {
	Button,
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
	Input,
} from "@repo/ui";
import { useState } from "react";

const API_PATH = "/api/strava/subscriptions";
export function StravaSubscriptionsNew() {
	const [callbackUrl, setCallbackUrl] = useState("");

	const createSubscription = async () => {
		const response = await fetch(API_PATH, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ callbackUrl }),
		});
		const data = await response.json();
		console.log("Subscription created:", data);
		// this should only reload the active subscription list
		window.location.reload();
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>Create Subscription</CardTitle>
				<CardDescription>
					Enter the callback URL for your webhook
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Input
					type="text"
					value={callbackUrl}
					onChange={(e) => setCallbackUrl(e.target.value)}
					placeholder="https://your-app.vercel.app/api/webhook"
					className="mb-2"
				/>
			</CardContent>
			<CardFooter>
				<Button onClick={createSubscription}>Create Subscription</Button>
			</CardFooter>
		</Card>
	);
}
