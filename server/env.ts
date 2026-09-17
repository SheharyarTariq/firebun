import "server-only";

/**
 * Server-only environment variables. Values are read lazily so that `next build`
 * and tooling can import server modules without every secret being present.
 */
function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Add it to .env.local (see .env.example).`
    );
  }
  return value;
}

export const env = {
  /** Supabase session pooler (port 5432). Used by the app at runtime — see db/pool.ts. */
  get databaseUrl() {
    return required("DATABASE_URL");
  },
  /** Session pooler / direct connection for drizzle-kit; defaults to DATABASE_URL. */
  get directUrl() {
    return process.env.DIRECT_URL ?? required("DATABASE_URL");
  },
  /** HS256 secret for the session cookie. Generate with `openssl rand -base64 32`. */
  get authSecret() {
    return required("AUTH_SECRET");
  },
  get isProduction() {
    return process.env.NODE_ENV === "production";
  },
};
