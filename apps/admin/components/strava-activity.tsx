import { formatTime, formatePace } from "@/lib/formatters";
import { formatDate } from "@repo/dates";
import type { DetailedActivityResponse } from "strava-v3";

export function StravaActivity({
	activity,
}: {
	activity: DetailedActivityResponse & {
		best_efforts?: {
			id: number;
			name: string;
			distance: number;
			moving_time: number;
		}[];
		photos?: { primary: { urls: { [key: string]: string } } | null };
	};
}) {
	const syncProviderActivity = () => {
		fetch(`/api/activities/strava/sync/${activity.id}`)
			.then((response) => response.json())
			.catch(console.error);
	};
	return (
		<div className="flex flex-col">
			<div className="flex flex-row">
				<div className="flex-1 flex flex-col space-y-2 border rounded p-4">
					<div>
						<span className="font-semibold">Name:</span> {activity.name}
					</div>
					<div>
						<span className="font-semibold">Device:</span>{" "}
						{/* @ts-expect-error */}
						{activity.device_name}
					</div>
					<div>
						<span className="font-semibold">Date:</span>{" "}
						{formatDate(new Date(activity.start_date))}
					</div>
					<div>
						<span className="font-semibold">Timezone:</span> {activity.timezone}
					</div>
					<div>
						<span className="font-semibold">Distance:</span>{" "}
						{activity.distance ? (activity.distance / 1000).toFixed(2) : "-"} km
					</div>
					<div>
						<span className="font-semibold">Moving Time:</span>{" "}
						{activity.moving_time ? formatTime(activity.moving_time) : "-"}
					</div>
					{activity.sport_type === "Run" && (
						<div>
							<span className="font-semibold">Average Pace: </span>{" "}
							{activity.average_speed
								? formatePace(activity.average_speed)
								: "-"}
						</div>
					)}
				</div>

				{activity.photos?.primary ? (
					<div className="hidden flex-1 md:flex flex-col space-y-2 border rounded p-4">
						<span className="font-semibold">Photo: </span>{" "}
						{activity.photos.primary.urls["600"] ? (
							<img
								src={activity.photos.primary.urls["600"]}
								alt="activity profile"
							/>
						) : (
							""
						)}
					</div>
				) : null}
			</div>
			<div className="flex flex-col">
				{activity.best_efforts && activity.best_efforts.length > 0 && (
					<div className="mt-4">
						<h4 className="font-bold mb-2">Max Efforts</h4>
						<ul className="space-y-1">
							{activity.best_efforts
								.filter(
									(effort) =>
										effort.distance > 0 && !effort.name.includes("mile"),
								)
								.map((effort) => (
									<li key={effort.id} className="border-b pb-1">
										<span className="font-semibold">{effort.name}:</span>{" "}
										{effort.distance} m, {formatTime(effort.moving_time)}
									</li>
								))}
						</ul>
					</div>
				)}
			</div>
			<div className="hidden md:flex flex-col item-start my-4 space-y-4">
				<div>
					<button
						type="button"
						className="border rounded p-2"
						onClick={syncProviderActivity}
					>
						sync
					</button>
				</div>
				<code className="border p-4">
					<pre>{JSON.stringify(activity, null, 2)}</pre>
				</code>
			</div>
		</div>
	);
}
