import "server-only";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { settings, type Settings } from "@/db/schema";
import { businessDateFor } from "@/utils/helper";

/** The single settings row, memoised per request. */
export const getSettings = cache(async (): Promise<Settings> => {
  const row = await getDb().query.settings.findFirst({ where: eq(settings.id, 1) });
  if (!row) throw new Error("Settings row is missing — run `npm run db:seed`.");
  return row;
});

/** Today's business date in shop time, honouring the configured day cutoff. */
export async function getTodayBusinessDate(): Promise<string> {
  const s = await getSettings();
  return businessDateFor(new Date(), s.businessDayCutoffHour);
}
