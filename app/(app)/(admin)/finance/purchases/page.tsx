import type { Metadata } from "next";
import PurchasesTable from "@/components/finance/purchases-table";
import { financePage } from "@/server/finance/exports";
import { exportPurchases, getPurchasesSummary } from "@/server/finance/queries";
import { getTodayBusinessDate } from "@/server/settings/queries";
import { FINANCE_PRESETS, resolvePeriod } from "@/utils/helper";

export const metadata: Metadata = { title: "Finance · Purchases" };

interface PageProps {
  searchParams: Promise<{ period?: string; from?: string; to?: string; page?: string }>;
}

export default async function FinancePurchasesPage({ searchParams }: PageProps) {
  const [query, today] = await Promise.all([searchParams, getTodayBusinessDate()]);
  const { preset, range } = resolvePeriod(query, today, FINANCE_PRESETS, "today");
  const { page, window } = financePage(query.page);
  const [rows, summary] = await Promise.all([exportPurchases(range, window), getPurchasesSummary(range)]);
  return <PurchasesTable rows={rows} summary={summary} range={range} preset={preset} page={page} />;
}
