/**
 * Public, client-safe configuration. Anything read from `process.env` here must be
 * `NEXT_PUBLIC_*` (it is inlined into the browser bundle). Server secrets live in
 * `server/env.ts`.
 */
export const config = {
  appName: "Fire Bun",
  timeZone: "Asia/Karachi",
  currency: "PKR",
  currencySymbol: "Rs",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
} as const;
