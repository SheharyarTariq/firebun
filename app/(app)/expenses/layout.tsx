import { Suspense } from "react";
import ExpensesShell from "@/components/expenses";
import { EXPENSE_CATEGORY_SUGGESTIONS } from "@/db/schema";
import { getCurrentUser } from "@/server/auth/dal";
import { listExpenseCategories } from "@/server/expenses/queries";
import { getSettings, getTodayBusinessDate } from "@/server/settings/queries";

/** Header, Add button and period picker persist here; the list underneath swaps per period. */
export default async function ExpensesLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [user, settings, today, usedCategories] = await Promise.all([
    getCurrentUser(),
    getSettings(),
    getTodayBusinessDate(),
    listExpenseCategories(),
  ]);
  const categories = [...new Set([...EXPENSE_CATEGORY_SUGGESTIONS, ...usedCategories])];

  return (
    <Suspense>
      <ExpensesShell today={today} categories={categories} canAdd={user.role === "admin" || settings.staffCanAddExpenses}>
        {children}
      </ExpensesShell>
    </Suspense>
  );
}
