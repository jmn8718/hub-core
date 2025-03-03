/* eslint-disable turbo/no-undeclared-env-vars */
import { createDbClient } from "@repo/db";

const useLocal = !!process.env.LOCAL_DB;

const db = createDbClient({
  ...(useLocal
    ? {
        url: process.env.LOCAL_DB,
        syncUrl: process.env.TURSO_DATABASE_URL,
      }
    : {
        url: process.env.TURSO_DATABASE_URL,
      }),
  authToken: process.env.TURSO_AUTH_TOKEN,
});

if (useLocal) {
  db.$client.sync().then(console.log).catch(console.error);
}

export default db;
