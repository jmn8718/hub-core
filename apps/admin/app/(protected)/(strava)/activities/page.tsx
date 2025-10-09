import { formatePace } from "@/lib/formatters";
import strava from "@/lib/strava";
import type { StravaActivity } from "@/types/strava";
import { formatDateWithTime } from "@repo/dates";

export default async function Activities({
	searchParams,
}: {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
	const query = await searchParams;
	const page = query.page ? Number(query.page) : 1;
	const activities = await (strava.client.athlete.listActivities({
		page,
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
			<div className="flex justify-center items-center gap-4 mt-6">
				{page > 1 && (
					<a
						href={`?page=${page - 1}`}
						className="px-4 py-2 border rounded bg-gray-100 hover:bg-gray-200"
					>
						Previous
					</a>
				)}
				{activities.length > 0 && (
					<a
						href={`?page=${page + 1}`}
						className="px-4 py-2 border rounded bg-gray-100 hover:bg-gray-200"
					>
						Next
					</a>
				)}
			</div>
		</div>
	);
}
