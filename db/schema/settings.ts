import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  integer,
  jsonb,
  pgTable,
  text,
} from "drizzle-orm/pg-core";
import { money, updatedAt } from "./_columns";
import { users } from "./users";

/** Single-row table (id is always 1). */
export const settings = pgTable(
  "settings",
  {
    id: integer().primaryKey(),
    shopName: text().notNull().default("Fire Bun"),
    phone: text(),
    phone2: text(),
    address: text(),

    defaultDeliveryCharge: money().notNull().default(50),
    /** 0 means staff cannot give discounts at all. */
    staffMaxDiscountPct: integer().notNull().default(10),
    staffCanAddExpenses: boolean().notNull().default(true),
    staffCancelWindowMinutes: integer().notNull().default(10),
    /** Orders before this hour (shop time) belong to the previous business day. */
    businessDayCutoffHour: integer().notNull().default(4),

    receiptHeaderLines: jsonb().$type<string[]>().notNull().default([]),
    receiptFooter: text().notNull().default("Thank you for choosing Fire Bun!"),
    charsPerLine: integer().notNull().default(32),
    printKitchenCopy: boolean().notNull().default(false),
    autoPrintOnPlace: boolean().notNull().default(true),

    updatedAt: updatedAt(),
    updatedBy: integer().references(() => users.id),
  },
  (t) => [
    check("settings_singleton_check", sql`${t.id} = 1`),
    check(
      "settings_cutoff_check",
      sql`${t.businessDayCutoffHour} between 0 and 12`
    ),
    check(
      "settings_staff_discount_check",
      sql`${t.staffMaxDiscountPct} between 0 and 100`
    ),
    check("settings_chars_check", sql`${t.charsPerLine} in (32, 42, 48)`),
  ]
);

export type Settings = typeof settings.$inferSelect;
