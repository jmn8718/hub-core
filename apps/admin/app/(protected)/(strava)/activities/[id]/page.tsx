"use client";

import Loader from "@/components/loader";
import { StravaActivity } from "@/components/strava-activity";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { DetailedActivityResponse } from "strava-v3";

export default function ActivityDetails() {
	const { id } = useParams<{ id: string }>();
	const [activity, setActivity] = useState<
		DetailedActivityResponse | undefined
	>(undefined);
	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		fetch(`/api/strava/activities/${id}`)
			.then((response) => response.json())
			.then((data) => {
				setActivity(data);
			})
			.catch(console.error);
	}, []);
	return activity ? <StravaActivity activity={activity} /> : <Loader />;
}
