import type { Metadata } from "next";
import ExpensesScreen from "@/components/expenses";
import { EXPENSE_CATEGORY_SUGGESTIONS } from "@/db/schema";
import { getCurrentUser } from "@/server/auth/dal";
import { listExpenseCategories, listExpenses, sumExpenses } from "@/server/expenses/queries";
import { getSettings, getTodayBusinessDate } from "@/server/settings/queries";
import { isIsoDate, rangeForPreset, type PeriodPreset } from "@/utils/helper";

export const metadata: Metadata = { title: "Expenses" };

interface PageProps {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}

const PRESETS: PeriodPreset[] = ["today", "last7", "thisMonth", "lastMonth", "custom"];

export default async function ExpensesPage({ searchParams }: PageProps) {
  const [{ period, from, to }, user, settings, today] = await Promise.all([
    searchParams,
    getCurrentUser(),
    getSettings(),
    getTodayBusinessDate(),
  ]);

  const preset: PeriodPreset = PRESETS.includes(period as PeriodPreset) ? (period as PeriodPreset) : "thisMonth";
  const range =
    preset === "custom" && isIsoDate(from) && isIsoDate(to) && from <= to
      ? { from, to }
      : rangeForPreset(preset === "custom" ? "thisMonth" : preset, today);

  const onlyOwn = user.role !== "admin";
  const [rows, total, usedCategories] = await Promise.all([
    listExpenses({ ...range, createdBy: onlyOwn ? user.id : undefined }),
    sumExpenses(range, onlyOwn ? user.id : undefined),
    listExpenseCategories(),
  ]);
  const categories = [...new Set([...EXPENSE_CATEGORY_SUGGESTIONS, ...usedCategories])];

  return (
    <ExpensesScreen
      rows={rows}
      total={total}
      range={range}
      preset={preset}
      today={today}
      categories={categories}
      canAdd={user.role === "admin" || settings.staffCanAddExpenses}
      canEdit={user.role === "admin"}
    />
  );
}
