"use server";

import { revalidatePath } from "next/cache";
import { expenseSchema, type ExpenseFormInput } from "@/components/expenses/schema";
import { getCurrentUser } from "@/server/auth/dal";
import { createExpense, deleteExpense, updateExpense } from "@/server/expenses/service";
import { runAction, validatedAction } from "@/server/run-action";
import type { ActionResult } from "@/utils/action-result";
import { routes } from "@/utils/routes";

function revalidate() {
  revalidatePath(routes.ui.expenses);
  revalidatePath(routes.ui.finance);
}

export async function createExpenseAction(input: ExpenseFormInput): Promise<ActionResult<{ id: number }>> {
  const user = await getCurrentUser();
  return validatedAction(expenseSchema, input, async () => {
    const row = await createExpense(input, user);
    revalidate();
    return { id: row.id };
  });
}

export async function updateExpenseAction(id: number, input: ExpenseFormInput): Promise<ActionResult<void>> {
  const user = await getCurrentUser();
  return validatedAction(expenseSchema, input, async () => {
    await updateExpense(id, input, user);
    revalidate();
  });
}

export async function deleteExpenseAction(id: number): Promise<ActionResult<void>> {
  const user = await getCurrentUser();
  return runAction(async () => {
    await deleteExpense(id, user);
    revalidate();
  });
}
