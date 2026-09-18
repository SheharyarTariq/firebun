import type { Metadata } from "next";
import FinanceReportView from "@/components/finance/report";
import { getFinanceReport } from "@/server/finance/queries";
import { getTodayBusinessDate } from "@/server/settings/queries";
import { FINANCE_PRESETS, resolvePeriod } from "@/utils/helper";

export const metadata: Metadata = { title: "Finance" };

interface PageProps {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}

export default async function FinancePage({ searchParams }: PageProps) {
  const [query, today] = await Promise.all([searchParams, getTodayBusinessDate()]);
  const { range } = resolvePeriod(query, today, FINANCE_PRESETS, "today");
  const report = await getFinanceReport(range);
  return <FinanceReportView report={report} />;
}
