import type { Metadata } from "next";
import ExpensesList from "@/components/expenses/list";
import { EXPENSE_CATEGORY_SUGGESTIONS } from "@/db/schema";
import { getCurrentUser } from "@/server/auth/dal";
import { listExpenseCategories, listExpenses, sumExpenses } from "@/server/expenses/queries";
import { getSettings, getTodayBusinessDate } from "@/server/settings/queries";
import { EXPENSE_PRESETS, resolvePeriod } from "@/utils/helper";

export const metadata: Metadata = { title: "Expenses" };

interface PageProps {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}

export default async function ExpensesPage({ searchParams }: PageProps) {
  const [query, user, settings, today] = await Promise.all([searchParams, getCurrentUser(), getSettings(), getTodayBusinessDate()]);
  const { range } = resolvePeriod(query, today, EXPENSE_PRESETS, "thisMonth");

  // Staff only see what they recorded themselves; admins see everything and may edit.
  const onlyOwn = user.role !== "admin";
  const [rows, total, usedCategories] = await Promise.all([
    listExpenses({ ...range, createdBy: onlyOwn ? user.id : undefined }),
    sumExpenses(range, onlyOwn ? user.id : undefined),
    listExpenseCategories(),
  ]);

  return (
    <ExpensesList
      rows={rows}
      total={total}
      categories={[...new Set([...EXPENSE_CATEGORY_SUGGESTIONS, ...usedCategories])]}
      today={today}
      canAdd={user.role === "admin" || settings.staffCanAddExpenses}
      canEdit={user.role === "admin"}
    />
  );
}
