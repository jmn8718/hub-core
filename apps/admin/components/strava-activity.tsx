import type { DetailedActivityResponse } from "strava-v3";

export function StravaActivity({
	activity,
}: { activity: DetailedActivityResponse }) {
	const syncProviderActivity = () => {
		fetch(`/api/activities/strava/sync/${activity.id}`)
			.then((response) => response.json())
			.then((data) => {
				console.log(data);
			})
			.catch(console.error);
	};
	return (
		<div className="flex flex-col">
			<table className="table-auto">
				<thead>
					<tr>
						<th className="uppercase">NAME</th>
						<th className="uppercase">DEVICE</th>
						<th className="uppercase">DATE</th>
						<th className="uppercase">TIMEZONE</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td className="px-4">{activity.name}</td>
						{/* @ts-expect-error */}
						<td className="px-4">{activity.device_name}</td>
						<td className="px-4">
							{/* @ts-expect-error */}
							{activity.start_date_local}
						</td>
						<td>{activity.timezone}</td>
					</tr>
				</tbody>
			</table>
			<div>
				<button type="button" onClick={syncProviderActivity}>
					sync
				</button>
			</div>
			<code>
				<pre>{JSON.stringify(activity, null, 2)}</pre>
			</code>
		</div>
	);
}
