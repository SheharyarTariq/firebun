import type { Metadata } from "next";
import FinanceScreen from "@/components/finance";
import { getFinanceReport } from "@/server/finance/queries";
import { getTodayBusinessDate } from "@/server/settings/queries";
import { isIsoDate, rangeForPreset, type PeriodPreset } from "@/utils/helper";

export const metadata: Metadata = { title: "Finance" };

interface PageProps {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}

const PRESETS: PeriodPreset[] = ["today", "yesterday", "last7", "last30", "thisMonth", "lastMonth", "custom"];

export default async function FinancePage({ searchParams }: PageProps) {
  const [{ period, from, to }, today] = await Promise.all([searchParams, getTodayBusinessDate()]);

  const preset: PeriodPreset = PRESETS.includes(period as PeriodPreset) ? (period as PeriodPreset) : "today";
  const range =
    preset === "custom" && isIsoDate(from) && isIsoDate(to) && from <= to
      ? { from, to }
      : rangeForPreset(preset === "custom" ? "today" : preset, today);

  const report = await getFinanceReport(range);
  return <FinanceScreen report={report} preset={preset} today={today} />;
}
