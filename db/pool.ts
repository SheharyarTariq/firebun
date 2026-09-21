import { Pool } from "pg";

/** Bump when pool options change so a hot-reloaded dev server builds a fresh pool. */
export const POOL_VERSION = 5;

/**
 * How the app reaches Postgres — read this before changing anything here.
 *
 * Vercel runs the app as short-lived copies that start, pause and stop with traffic, and
 * Supabase's free plan only lets them in through its pooler (Supavisor; the direct database
 * address is IPv6-only). The pooler has two modes on the same host:
 *
 * - Session mode (port 5432): every open client connection pins a database worker for as
 *   long as it stays open. On 2026-09-20/21 paused Vercel copies kept theirs open, filled the
 *   pool and the app went down with `(EMAXCONNSESSION) max clients reached in session mode`
 *   — logged only in the pooler's logs (supavisor_logs), never in Postgres.
 * - Transaction mode (port 6543), used by the app: a worker is borrowed only for the
 *   milliseconds a query or transaction runs, so paused copies hold nothing. About 200
 *   client connections share the pool's workers (`default_pool_size`, 40 since 2026-09-21).
 *
 * The app used to be on session mode because the previous driver, postgres.js, pipelines
 * queries and transaction mode stalls on that (pages hung forever). `pg` sends one query at
 * a time per connection, so transaction mode is safe with it.
 *
 * `attachDatabasePool` (in `db/index.ts`) keeps a Vercel copy alive after its last query
 * until `idleTimeoutMillis` closes the idle connections, so nothing is left open while it is
 * paused. Transactions pin one connection each: never call `getDb()` inside a transaction
 * body — pass `tx` — or two requests could wait on each other for a free connection.
 */
export function createPgPool(url: string, max = 5): Pool {
  return new Pool({
    connectionString: url,
    max,
    idleTimeoutMillis: 5_000,
    connectionTimeoutMillis: 10_000,
  });
}

/**
 * The app always connects through the transaction pooler. `DATABASE_URL` (Vercel and
 * `.env.local`) holds Supabase's session-pooler address on 5432; switching the port here,
 * rather than in every environment, means a deploy can never end up on session mode because
 * a dashboard setting was missed. Non-Supabase URLs are returned unchanged.
 */
export function transactionPoolerUrl(url: string): string {
  const parsed = new URL(url);
  if (parsed.hostname.endsWith(".pooler.supabase.com") && parsed.port === "5432") {
    parsed.port = "6543";
    return parsed.toString();
  }
  return url;
}
