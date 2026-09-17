import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { expenses, type Expense } from "@/db/schema";
import type { CurrentUser } from "@/server/auth/dal";
import { ServiceError } from "@/server/errors";
import { getSettings } from "@/server/settings/queries";
import { roundMoney, toIsoDate } from "@/utils/helper";

export interface ExpenseInput {
  category: string;
  amount: number;
  description: string;
  /** yyyy-mm-dd in shop time; not in the future. */
  expenseDate: string;
}

function normalise(input: ExpenseInput) {
  if (input.expenseDate > toIsoDate()) {
    throw new ServiceError("The date cannot be in the future.", { expenseDate: "In the future" });
  }
  const amount = roundMoney(input.amount);
  if (!(amount > 0)) throw new ServiceError("Amount must be more than 0.", { amount: "Must be more than 0" });
  return {
    category: input.category.trim(),
    amount,
    description: input.description.trim(),
    expenseDate: input.expenseDate,
  };
}

export async function createExpense(input: ExpenseInput, user: CurrentUser): Promise<Expense> {
  if (user.role !== "admin") {
    const settings = await getSettings();
    if (!settings.staffCanAddExpenses) {
      throw new ServiceError("Staff cannot add expenses. Ask an admin.");
    }
  }
  const [row] = await getDb()
    .insert(expenses)
    .values({ ...normalise(input), createdBy: user.id })
    .returning();
  return row;
}

export async function updateExpense(id: number, input: ExpenseInput, user: CurrentUser): Promise<Expense> {
  if (user.role !== "admin") throw new ServiceError("Only an admin can edit expenses.");
  const [row] = await getDb()
    .update(expenses)
    .set({ ...normalise(input), updatedBy: user.id, updatedAt: new Date() })
    .where(eq(expenses.id, id))
    .returning();
  if (!row) throw new ServiceError("Expense not found.");
  return row;
}

export async function deleteExpense(id: number, user: CurrentUser): Promise<void> {
  if (user.role !== "admin") throw new ServiceError("Only an admin can delete expenses.");
  const [row] = await getDb().delete(expenses).where(eq(expenses.id, id)).returning({ id: expenses.id });
  if (!row) throw new ServiceError("Expense not found.");
}
