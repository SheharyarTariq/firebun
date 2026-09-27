"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import PeriodPicker from "@/components/common/PeriodPicker";
import TabLinks from "@/components/common/TabLinks";
import PageHeader from "@/components/layout/page-header";
import PageBody from "@/components/layout/page-body";
import { FINANCE_PRESETS, formatBusinessDate, periodSearch, rangeDays, resolvePeriod, type DateRange, type PeriodPreset } from "@/utils/helper";
import { routes } from "@/utils/routes";

interface FinanceShellProps {
  today: string;
  /** The report page, swapped (with its own loading state) when the period changes. */
  children: React.ReactNode;
}

const TABS = [
  { href: routes.ui.finance, label: "Summary" },
  { href: routes.ui.financeOrders, label: "Orders" },
  { href: routes.ui.financePurchases, label: "Purchases" },
  { href: routes.ui.financeExpenses, label: "Expenses" },
];

/**
 * Lives in the route layout so the header, period chips and tabs stay put between periods and
 * tabs. The period is in the URL, so every tab reads the same one.
 */
export default function FinanceShell({ today, children }: FinanceShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { preset, range } = resolvePeriod(
    { period: params.get("period"), from: params.get("from"), to: params.get("to") },
    today,
    FINANCE_PRESETS,
    "today"
  );
  const days = rangeDays(range);

  // Stay on the current tab; a new period also starts again from page 1.
  const navigate = (next: { preset: PeriodPreset; range?: DateRange }) => {
    router.push(`${pathname}${periodSearch(next.preset, next.range ?? range)}`);
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
        <TabLinks
          aria-label="Finance views"
          tabs={TABS.map((tab) => ({ ...tab, href: `${tab.href}${periodSearch(preset, range)}`, active: pathname === tab.href }))}
        />
        {children}
      </PageBody>
    </>
  );
}
