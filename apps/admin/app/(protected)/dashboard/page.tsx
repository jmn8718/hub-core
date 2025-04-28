import db from "@/lib/db";
import { formatDateWithTime } from "@repo/dates";
import { desc, webhooks } from "@repo/db";
import { ScrollArea } from "@repo/ui";
import Link from "next/link";
import { DeleteRow } from "./delete-row-button";

export default async function DashboardPage() {
	const data = await db
		.select()
		.from(webhooks)
		.orderBy(desc(webhooks.id))
		.limit(10);
	return (
		<div>
			<h1 className="text-2xl font-bold mb-4 capitalize">webhook logs</h1>
			<ScrollArea className="h-[900px]">
				<table className="table-auto">
					<thead>
						<tr>
							<th className="uppercase" />
							<th className="uppercase">id</th>
							<th className="uppercase">date</th>
							<th className="uppercase">type</th>
							<th className="uppercase">event</th>
							<th className="uppercase">activity id</th>
							<th className="uppercase">data</th>
						</tr>
					</thead>
					<tbody>
						{data.map((webhook) => {
							const event = JSON.parse(webhook.event || "{}");
							return (
								<tr key={webhook.id}>
									<td className="px-4">
										<DeleteRow id={webhook.id} />
									</td>
									<td className="px-4">{webhook.id}</td>
									<td className="px-4">
										{formatDateWithTime(webhook.created_at, "Asia/Seoul")}
									</td>
									<td className="px-4">{webhook.object_type}</td>
									<td className="px-4">{webhook.aspect_type}</td>
									<td className="px-4">
										<Link href={`/activities/${webhook.object_id}`}>
											{webhook.object_id}
										</Link>
									</td>
									<td className="px-4">{JSON.stringify(event, null, 2)}</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</ScrollArea>
		</div>
	);
}
