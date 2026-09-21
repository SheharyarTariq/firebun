import { attachDatabasePool } from "@vercel/functions";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import { env } from "@/server/env";
import { POOL_VERSION, createPgPool, transactionPoolerUrl } from "./pool";
import * as schema from "./schema";

export type Db = NodePgDatabase<typeof schema>;
type Transaction = Parameters<Parameters<Db["transaction"]>[0]>[0];
/** Accepts either the root db or a transaction handle, so services compose. */
export type DbOrTx = Db | Transaction;

const POOL_KEY = `__firebunPg_v${POOL_VERSION}`;
const globalForDb = globalThis as unknown as Record<string, Pool | undefined>;

/**
 * The pg pool survives dev hot reloads on `globalThis` (otherwise every edit would open new
 * connections), but the Drizzle wrapper is created per module instance: Drizzle caches
 * column names per instance, so a wrapper built before a schema edit would not know about
 * new columns and would fail with "reading 'replace'". Pool settings and the choice of
 * Supabase pooler mode live in `db/pool.ts`.
 */
let db: Db | undefined;

function getPool(): Pool {
  const cached = globalForDb[POOL_KEY];
  if (cached) return cached;
  const pool = createPgPool(transactionPoolerUrl(env.databaseUrl));
  // On Vercel: close idle connections before the copy is paused (no-op elsewhere).
  attachDatabasePool(pool);
  if (!env.isProduction) globalForDb[POOL_KEY] = pool;
  return pool;
}

export function getDb(): Db {
  db ??= drizzle(getPool(), { schema, casing: "snake_case" });
  return db;
}
