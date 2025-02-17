import { formatDate } from "@/lib/dates";
import db from "@/lib/db";
import { webhooks, desc } from "@repo/db";
import { DeleteRow } from "./delete-row-button";
import { ScrollArea } from "@repo/ui";

export default async function DashboardPage() {
  const data = await db.select().from(webhooks).orderBy(desc(webhooks.id));
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4 capitalize">webhook logs</h1>
      <ScrollArea className="h-[900px]">
        <table className="table-auto">
          <thead>
            <tr>
              <th className="uppercase"></th>
              <th className="uppercase">id</th>
              <th className="uppercase">date</th>
              <th className="uppercase">type</th>
              <th className="uppercase">event</th>
              <th className="uppercase">data</th>
            </tr>
          </thead>
          <tbody>
            {data.map((webhook) => (
              <tr key={webhook.id}>
                <td className="px-4">
                  <DeleteRow id={webhook.id} />
                </td>
                <td className="px-4">{webhook.id}</td>
                <td className="px-4">
                  {formatDate(webhook.event_time, "YYYY-MM-DD HH:mm:ss")}
                </td>
                <td className="px-4">{webhook.object_type}</td>
                <td className="px-4">{webhook.aspect_type}</td>
                <td className="px-4">{webhook.updates}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollArea>
    </div>
  );
}
