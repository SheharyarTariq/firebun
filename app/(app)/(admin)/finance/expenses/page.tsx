import type { Metadata } from "next";
import ExpensesTable from "@/components/finance/expenses-table";
import { financePage } from "@/server/finance/exports";
import { exportExpenses, getExpensesSummary } from "@/server/finance/queries";
import { getTodayBusinessDate } from "@/server/settings/queries";
import { FINANCE_PRESETS, resolvePeriod } from "@/utils/helper";

export const metadata: Metadata = { title: "Finance · Expenses" };

interface PageProps {
  searchParams: Promise<{ period?: string; from?: string; to?: string; page?: string }>;
}

export default async function FinanceExpensesPage({ searchParams }: PageProps) {
  const [query, today] = await Promise.all([searchParams, getTodayBusinessDate()]);
  const { preset, range } = resolvePeriod(query, today, FINANCE_PRESETS, "today");
  const { page, window } = financePage(query.page);
  const [rows, summary] = await Promise.all([exportExpenses(range, window), getExpensesSummary(range)]);
  return <ExpensesTable rows={rows} summary={summary} range={range} preset={preset} page={page} />;
}
