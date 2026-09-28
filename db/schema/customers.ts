import { sql } from "drizzle-orm";
import { index, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "./_columns";

/**
 * People the shop knows by name — mainly the ones who take food on credit.
 *
 * The phone is the identity, not the name: names get typed three ways and one debtor would
 * become three, each owing part of the money. It is stored already normalised by
 * `normalisePhone` (digits only, local 03xx form), so the unique index does the work.
 */
export const customers = pgTable(
  "customers",
  {
    id: id(),
    /**
     * Optional: a shop often knows a regular only by their number. The phone below is the
     * identity, so a nameless customer is still a real, findable one — `customerLabel` shows
     * the number in place of a name.
     */
    name: text(),
    /** Normalised by `normalisePhone` before every write and every lookup. */
    phone: text().notNull(),
    /** Free text: "shop next door", "Ali's brother". */
    note: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("customers_phone_idx").on(t.phone),
    index("customers_name_idx").on(sql`lower(${t.name})`),
  ]
).enableRLS();

export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
