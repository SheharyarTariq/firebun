import "server-only";
import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { expenses } from "@/db/schema";
import type { DateRange } from "@/utils/helper";

export interface ListExpensesFilter extends DateRange {
  /** Staff only see their own entries. */
  createdBy?: number;
}

export async function listExpenses(filter: ListExpensesFilter) {
  return getDb().query.expenses.findMany({
    where: and(
      gte(expenses.expenseDate, filter.from),
      lte(expenses.expenseDate, filter.to),
      filter.createdBy !== undefined ? eq(expenses.createdBy, filter.createdBy) : undefined
    ),
    orderBy: [desc(expenses.expenseDate), desc(expenses.id)],
    with: { createdByUser: { columns: { name: true } } },
  });
}

export type ExpenseRow = Awaited<ReturnType<typeof listExpenses>>[number];

/** Distinct categories already used, for the suggestion list. */
export async function listExpenseCategories(): Promise<string[]> {
  const rows = await getDb()
    .selectDistinct({ category: expenses.category })
    .from(expenses)
    .orderBy(asc(expenses.category));
  return rows.map((r) => r.category);
}

export async function sumExpenses(range: DateRange, createdBy?: number): Promise<number> {
  const [row] = await getDb()
    .select({ total: sql<string>`coalesce(sum(${expenses.amount}), 0)` })
    .from(expenses)
    .where(
      and(
        gte(expenses.expenseDate, range.from),
        lte(expenses.expenseDate, range.to),
        createdBy !== undefined ? eq(expenses.createdBy, createdBy) : undefined
      )
    );
  return Number(row?.total ?? 0);
}
