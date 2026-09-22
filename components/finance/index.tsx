"use client";

import { useRouter, useSearchParams } from "next/navigation";
import PeriodPicker from "@/components/common/PeriodPicker";
import PageHeader from "@/components/layout/page-header";
import PageBody from "@/components/layout/page-body";
import { FINANCE_PRESETS, formatBusinessDate, rangeDays, resolvePeriod, type DateRange, type PeriodPreset } from "@/utils/helper";
import { routes } from "@/utils/routes";

interface FinanceShellProps {
  today: string;
  /** The report page, swapped (with its own loading state) when the period changes. */
  children: React.ReactNode;
}

/** Lives in the route layout so the header and period chips stay put between periods. */
export default function FinanceShell({ today, children }: FinanceShellProps) {
  const router = useRouter();
  const params = useSearchParams();
  const { preset, range } = resolvePeriod(
    { period: params.get("period"), from: params.get("from"), to: params.get("to") },
    today,
    FINANCE_PRESETS,
    "today"
  );
  const days = rangeDays(range);

  const navigate = (next: { preset: PeriodPreset; range?: DateRange }) => {
    const query = new URLSearchParams({ period: next.preset });
    if (next.preset === "custom" && next.range) {
      query.set("from", next.range.from);
      query.set("to", next.range.to);
    }
    router.push(`${routes.ui.finance}?${query.toString()}`);
  };

  const subtitle =
    range.from === range.to
      ? formatBusinessDate(range.from)
      : `${formatBusinessDate(range.from)} – ${formatBusinessDate(range.to)} · ${days} days`;

  return (
    <>
      <PageHeader title="Finance" subtitle={subtitle} backHref={routes.ui.more} />
      <PageBody gap={4}>
        <PeriodPicker key={preset} preset={preset} range={range} today={today} onChange={navigate} />
        {children}
      </PageBody>
    </>
  );
}
