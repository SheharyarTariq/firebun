import { integer, numeric, timestamp } from "drizzle-orm/pg-core";

/** Shared column builders so every table uses the same precision rules. */

export const id = () => integer().primaryKey().generatedAlwaysAsIdentity();

export const createdAt = () =>
  timestamp({ withTimezone: true }).notNull().defaultNow();

export const updatedAt = () =>
  timestamp({ withTimezone: true }).notNull().defaultNow();

export const timestampTz = () => timestamp({ withTimezone: true });

/** Rupees with paisa: 999999999.99 */
export const money = () => numeric({ precision: 12, scale: 2, mode: "number" });

/** Stock quantities in base units (g / ml / pcs), 3 decimals. */
export const quantity = () => numeric({ precision: 14, scale: 3, mode: "number" });

/** Cost per base unit — cheese at Rs 600/kg is Rs 0.6/g, so 6 decimals are needed. */
export const unitCost = () => numeric({ precision: 14, scale: 6, mode: "number" });
