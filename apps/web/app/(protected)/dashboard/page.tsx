import db from "@/lib/db";
import { webhooks, desc } from "@repo/db";

export default async function DashboardPage() {
  const data = await db.select().from(webhooks).orderBy(desc(webhooks.id));
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      {data.map((webhook) => (
        <div key={webhook.id} className="py-1">
          {JSON.stringify(webhook, null, 2)}
        </div>
      ))}
    </div>
  );
}
