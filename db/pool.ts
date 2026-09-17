import postgres from "postgres";

export type PgClient = ReturnType<typeof postgres>;

/** Bump when pool options change so a hot-reloaded dev server builds a fresh pool. */
export const POOL_VERSION = 3;

/**
 * The app connects through Supabase's **session** pooler (Supavisor, port 5432).
 *
 * Why not the transaction pooler (6543) that Supabase recommends for serverless:
 * postgres.js pipelines queued queries on a connection, and Supavisor in transaction
 * mode stalls the connection when a query is pipelined behind a long one (reproduced
 * with the menu's nested relational query — the page hung forever, no error anywhere).
 * Its `max_pipeline: 0` escape hatch skips the `onexecute` callback that transactions
 * need, so it cannot be used either. Session mode has no such problem.
 *
 * Session mode holds one backend connection per client connection, so keep `max`
 * small: a few Vercel instances × 3 stays well inside the project's pool size.
 * `prepare: false` keeps the client pooler-agnostic.
 */
export function createPool(url: string, max: number): PgClient {
  return postgres(url, {
    prepare: false,
    max,
    idle_timeout: 20,
    connect_timeout: 10,
  });
}
