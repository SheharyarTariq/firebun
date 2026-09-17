import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { env } from "@/server/env";
import { POOL_VERSION, createPool, type PgClient } from "./pool";
import * as schema from "./schema";

export type Db = PostgresJsDatabase<typeof schema>;
type Transaction = Parameters<Parameters<Db["transaction"]>[0]>[0];
/** Accepts either the root db or a transaction handle, so services compose. */
export type DbOrTx = Db | Transaction;

const POOL_KEY = `__firebunPg_v${POOL_VERSION}`;
const globalForDb = globalThis as unknown as Record<string, PgClient | undefined>;

/**
 * The postgres.js pool survives dev hot reloads on `globalThis` (otherwise every edit
 * would open new connections), but the Drizzle wrapper is created per module instance.
 * Drizzle caches column names per instance, so a wrapper built before a schema edit
 * would not know about new columns and would fail with "reading 'replace'".
 * Pool settings and the choice of Supabase pooler live in `db/pool.ts`.
 */
let db: Db | undefined;

function getClient(): PgClient {
  const cached = globalForDb[POOL_KEY];
  if (cached) return cached;
  const client = createPool(env.databaseUrl, 3);
  if (!env.isProduction) globalForDb[POOL_KEY] = client;
  return client;
}

export function getDb(): Db {
  db ??= drizzle(getClient(), { schema, casing: "snake_case" });
  return db;
}
