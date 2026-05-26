import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

type Database = PostgresJsDatabase<typeof schema>;

let cached: Database | undefined;

function createDb(): Database {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  const client = postgres(url, { prepare: false, max: 10 });
  return drizzle(client, { schema });
}

export const db: Database = new Proxy({} as Database, {
  get(_, prop) {
    if (!cached) cached = createDb();
    return Reflect.get(cached, prop);
  },
});

export { schema };
