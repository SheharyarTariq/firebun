import { sql } from "drizzle-orm";
import { check, date, index, integer, pgTable, text } from "drizzle-orm/pg-core";
import { createdAt, id, money, timestampTz } from "./_columns";
import { users } from "./users";

/** Suggested categories; the column is free text so the owner can add more. */
export const EXPENSE_CATEGORY_SUGGESTIONS = [
  "Rent",
  "Electricity",
  "Gas",
  "Salary",
  "Rider",
  "Maintenance",
  "Packaging",
  "Other",
] as const;

export const expenses = pgTable(
  "expenses",
  {
    id: id(),
    category: text().notNull(),
    amount: money().notNull(),
    description: text().notNull(),
    /** Shop-local calendar date, for period reports. */
    expenseDate: date({ mode: "string" }).notNull(),
    createdBy: integer()
      .notNull()
      .references(() => users.id),
    createdAt: createdAt(),
    updatedBy: integer().references(() => users.id),
    updatedAt: timestampTz(),
  },
  (t) => [
    index("expenses_date_idx").on(t.expenseDate),
    index("expenses_created_by_idx").on(t.createdBy, t.expenseDate),
    check("expenses_amount_check", sql`${t.amount} > 0`),
  ]
);

export type Expense = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;
