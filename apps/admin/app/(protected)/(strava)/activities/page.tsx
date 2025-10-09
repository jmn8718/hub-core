import { formatePace } from "@/lib/formatters";
import strava from "@/lib/strava";
import type { StravaActivity } from "@/types/strava";
import { formatDateWithTime } from "@repo/dates";

export default async function Activities() {
	const activities = await (strava.client.athlete.listActivities({
		page: 1,
		per_page: 25,
		access_token: strava.token,
	}) as Promise<StravaActivity[]>);

	return (
		<div className="flex flex-col">
			{activities.map((activity) => (
				<div key={activity.id} className="border-b py-2">
					<h3 className="text-lg font-semibold">
						<a
							href={`/activities/${activity.id}`}
							className="text-blue-600 hover:underline"
						>
							ID: {activity.id}
						</a>{" "}
						- {activity.name}
					</h3>
					<p className="text-sm text-gray-500">
						{formatDateWithTime(new Date(activity.start_date))}
					</p>
					<p>Distance: {(activity.distance / 1000).toFixed(2)} km</p>
					<p>
						Moving Time: {Math.floor(activity.moving_time / 60)} min{" "}
						{activity.moving_time % 60} sec
					</p>
					{activity.type === "Run" && (
						<p>Average Pace: {formatePace(activity.average_speed)}</p>
					)}
				</div>
			))}
		</div>
	);
}
