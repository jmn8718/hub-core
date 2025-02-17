import "dotenv/config";
import { createDbClient } from "./index.js";
import { webhooks } from "./schema.js";

async function run() {
  const db = createDbClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  const event_time = 1549560669;
  await db.insert(webhooks).values({
    owner_id: 9,
    aspect_type: "create",
    object_id: 0,
    object_type: "activity",
    updates: "{}",
    event_time: new Date(event_time * 1000).toISOString(),
    created_at: new Date().toISOString(),
  });
}

run().then(() => {
  console.log("Seeding complete.");
});
