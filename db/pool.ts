import postgres from "postgres";

export type PgClient = ReturnType<typeof postgres>;

/** Bump when pool options change so a hot-reloaded dev server builds a fresh pool. */
export const POOL_VERSION = 4;

/**
 * Connections per server instance. One is enough and is what keeps the shop online:
 *
 * The app connects through Supabase's **session** pooler (Supavisor, port 5432), where
 * every client connection pins one Postgres backend for as long as it stays open. The
 * pool is small (pool_size 15 by default on this plan, raised to 25 on 2026-09-21) and
 * Vercel keeps an instance's sockets open while it is idle or frozen. With `max: 3`, five
 * warm instances filled the pool and every further request failed with
 * `EMAXCONNSESSION max clients reached in session mode` — logged only in the pooler's
 * logs (supavisor_logs), never in Postgres.
 *
 * `max: 1` is safe here: session mode handles postgres.js pipelining, so a page's
 * parallel queries simply queue on the one connection, and no transaction reaches back
 * to `getDb()` for a second connection (every nested call passes `tx`), so it cannot
 * deadlock. Keep it that way when writing new services.
 */
export const POOL_MAX = 1;

/**
 * Why not the transaction pooler (6543) that Supabase recommends for serverless:
 * postgres.js pipelines queued queries on a connection, and Supavisor in transaction
 * mode stalls the connection when a query is pipelined behind a long one (reproduced
 * with the menu's nested relational query — the page hung forever, no error anywhere).
 * Its `max_pipeline: 0` escape hatch skips the `onexecute` callback that transactions
 * need, so it cannot be used either.
 *
 * `idle_timeout` hands the slot back a few seconds after the last query instead of 20,
 * so a quiet instance does not sit on it. `prepare: false` keeps the client
 * pooler-agnostic.
 */
export function createPool(url: string, max: number = POOL_MAX): PgClient {
  return postgres(url, {
    prepare: false,
    max,
    idle_timeout: 5,
    connect_timeout: 10,
  });
}
