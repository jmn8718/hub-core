import type { DetailedActivityResponse } from "strava-v3";

export function StravaActivity({
	activity,
}: { activity: DetailedActivityResponse }) {
	return (
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
	);
}
