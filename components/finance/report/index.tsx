import { Download, TrendingDown, TrendingUp } from "lucide-react";
import Banner from "@/components/common/Banner";
import Card from "@/components/common/Card";
import SectionHeading from "@/components/common/SectionHeading";
import { BarList, DayColumns } from "@/components/finance/charts";
import type { FinanceReport } from "@/server/finance/queries";
import { cn } from "@/utils/cn";
import { formatBusinessDate, formatMoney, rangeDays, shiftIsoDate } from "@/utils/helper";
import { routes } from "@/utils/routes";

interface FinanceReportViewProps {
  report: FinanceReport;
}

/** The numbers for one period. Rendered on the server; no interactivity needed. */
export default function FinanceReportView({ report }: FinanceReportViewProps) {
  const { range, sales, purchases, expenses, pending, previous } = report;
  const days = rangeDays(range);
  const grossMargin = sales.income > 0 ? Math.round(((sales.income - report.ingredientCost) / sales.income) * 100) : null;
  const profitMargin = sales.income > 0 ? Math.round((report.profit / sales.income) * 100) : null;
  const previousLabel = days === 1 ? "yesterday" : days === 7 ? "the week before" : `the ${days} days before`;
  const buckets = buildBuckets(report.byDay, range.from, range.to, days);

  return (
    <>
      {/* Four KPIs across on a monitor instead of a 2×2 block with the rest scrolled away. */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile
          label="Income"
          value={formatMoney(sales.income)}
          hint={`${sales.orders} paid order${sales.orders === 1 ? "" : "s"}`}
          tone="success"
          delta={<Delta now={sales.income} before={previous.income} label={previousLabel} />}
        />
        <Tile
          label="Profit (est.)"
          value={formatMoney(report.profit)}
          hint={profitMargin === null ? "Income − ingredients − expenses" : `${profitMargin}% of income`}
          tone={report.profit >= 0 ? "success" : "danger"}
          delta={<Delta now={report.profit} before={previous.profit} label={previousLabel} />}
        />
        <Tile label="Ingredient cost (est.)" value={formatMoney(report.ingredientCost)} hint={grossMargin === null ? "From recipes" : `${grossMargin}% gross margin`} />
        <Tile label="Expenses" value={formatMoney(expenses.total)} hint={`${expenses.count} entr${expenses.count === 1 ? "y" : "ies"}`} tone="warning" />
      </div>

      {/*
        * On a monitor the report's cards sit two-up. In one column each card's label/value rows
        * ran the full width of the window, putting every number an inch from its own label.
        *
        * CSS columns rather than a grid: the cards are wildly different heights, and a grid would
        * leave a dead column under every short card while it waited for the tall one beside it.
        */}
      <div className="space-y-4 xl:columns-2 xl:gap-4 xl:space-y-0 xl:[&>*]:mb-4 xl:[&>*]:break-inside-avoid">
      <Card className="space-y-2">
        <SectionHeading>Cash</SectionHeading>
        <Row label="Money in (paid orders)" value={formatMoney(sales.income)} />
        <Row label={`Cash out for stock (${purchases.count})`} value={`− ${formatMoney(purchases.total)}`} />
        <Row label={`Expenses (${expenses.count})`} value={`− ${formatMoney(expenses.total)}`} />
        <div className="border-t border-border" />
        <Row label="Net cash" value={formatMoney(report.net)} hint="What the till gained or lost, counting stock when it was bought" strong />
        {days === 1 && <Row label="Cash sales today" value={formatMoney(sales.cash)} muted hint={`plus ${formatMoney(sales.online)} online / transfer`} />}
      </Card>

      {pending.orders > 0 && (
        <Banner tone="warning" compact>
          {pending.orders} unpaid delivery order{pending.orders === 1 ? "" : "s"} worth {formatMoney(pending.amount)} not counted yet.
        </Banner>
      )}

      <Card className="space-y-2">
        <SectionHeading>Sales</SectionHeading>
        <Row label="Food & drinks" value={formatMoney(sales.subtotal)} />
        {sales.discounts > 0 && <Row label="Discounts given" value={`− ${formatMoney(sales.discounts)}`} />}
        {sales.delivery > 0 && <Row label="Delivery charges" value={formatMoney(sales.delivery)} />}
        <Row label="Cash" value={formatMoney(sales.cash)} muted />
        <Row label="Online / transfer" value={formatMoney(sales.online)} muted />
        {report.cancelled > 0 && <Row label="Cancelled orders" value={String(report.cancelled)} muted />}
        <Row label="Average order" value={formatMoney(sales.average)} muted />
      </Card>

      {expenses.byCategory.length > 0 && (
        <Card className="space-y-3">
          <SectionHeading>Expenses by category</SectionHeading>
          {/* A distribution printed as label/value rows makes you do the comparing yourself. */}
          <BarList
            tone="spend"
            format={formatMoney}
            data={expenses.byCategory.map((c) => ({ key: c.category, label: c.category, value: c.total }))}
          />
        </Card>
      )}

      {report.topItems.length > 0 && (
        <Card className="space-y-3">
          <SectionHeading>Top sellers</SectionHeading>
          {/* Ranked *and* weighted — as a plain list, #1 and #10 carried identical visual weight. */}
          <BarList
            format={formatMoney}
            data={report.topItems.map((item) => ({
              key: `${item.name}-${item.variant}`,
              label: item.variant === "Regular" ? item.name : `${item.name} · ${item.variant}`,
              sub: `${item.quantity}×`,
              value: item.revenue,
            }))}
          />
        </Card>
      )}

      {/* One day is not a trend — the columns would just be a single full-height bar. */}
      {days > 1 && report.byDay.length > 1 && (
        <Card className="space-y-3">
          <SectionHeading>Income by {buckets.unit}</SectionHeading>
          <DayColumns format={formatMoney} unit={buckets.unit} data={buckets.data} />
        </Card>
      )}

      {report.recentPurchases.length > 0 && (
        <Card className="space-y-2">
          <SectionHeading>Stock purchases</SectionHeading>
          <ul className="divide-y divide-border">
            {/* Up to 50 rows used to render in full, burying everything below them. */}
            {report.recentPurchases.slice(0, 8).map((p) => (
              <li key={p.id} className={cn("flex items-center gap-3 py-2 text-sm", p.voided && "opacity-50 line-through")}>
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{p.item}</span>
                  <span className="block text-xs text-muted">
                    {formatBusinessDate(p.date)} · {p.qty} {p.unit}
                    {p.supplier ? ` · ${p.supplier}` : ""}
                  </span>
                </span>
                <span className="font-medium tabular-nums">{formatMoney(p.total)}</span>
              </li>
            ))}
          </ul>
          {report.recentPurchases.length > 8 && (
            <p className="pt-1 text-label text-muted">
              + {report.recentPurchases.length - 8} more in the period · {formatMoney(purchases.total)} in total
            </p>
          )}
        </Card>
      )}

      </div>

      <Card className="space-y-2">
        <SectionHeading>Export (CSV)</SectionHeading>
        <div className="grid grid-cols-3 gap-2 sm:max-w-md">
          {(["orders", "purchases", "expenses"] as const).map((type) => (
            <a
              key={type}
              href={routes.api.financeExport(type, range.from, range.to)}
              className="flex h-11 items-center justify-center gap-1.5 rounded-field border border-border text-sm font-medium capitalize transition-colors active:bg-surface-2"
            >
              <Download className="h-4 w-4" /> {type}
            </a>
          ))}
        </div>
      </Card>
    </>
  );
}

function Tile({
  label,
  value,
  hint,
  tone,
  delta,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "success" | "warning" | "danger";
  delta?: React.ReactNode;
}) {
  return (
    <Card className="space-y-1 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className={cn("text-xl font-bold tabular-nums", tone === "success" && "text-success", tone === "warning" && "text-warning", tone === "danger" && "text-danger")}>{value}</p>
      {hint && <p className="text-label text-muted">{hint}</p>}
      {delta}
    </Card>
  );
}

/** "+12% vs yesterday" in green / red; hidden when there is nothing to compare with. */
function Delta({ now, before, label }: { now: number; before: number; label: string }) {
  if (before === 0 && now === 0) return null;
  if (before === 0) return <p className="text-xs text-muted">Nothing {label}</p>;
  const pct = Math.round(((now - before) / Math.abs(before)) * 100);
  const up = pct >= 0;
  return (
    <p className={cn("flex items-center gap-1 text-xs font-medium", up ? "text-success" : "text-danger")}>
      {up ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
      {up ? "+" : ""}
      {pct}% vs {label}
    </p>
  );
}

function Row({ label, value, muted, indent, hint, strong }: { label: string; value: string; muted?: boolean; indent?: boolean; hint?: string; strong?: boolean }) {
  return (
    <div className={cn("flex items-baseline justify-between gap-3 text-sm", muted && "text-muted", indent && "pl-4", strong && "text-base font-semibold")}>
      <span className="min-w-0">
        {label}
        {hint && <span className="block text-xs font-normal text-muted">{hint}</span>}
      </span>
      <span className="shrink-0 font-medium tabular-nums">{value}</span>
    </div>
  );
}

/**
 * Turns the income-per-day rows into a continuous series for the column chart.
 *
 * Two things the raw rows can't do. They only contain days that *had* income, so plotting them
 * directly draws a quiet Tuesday right next to a busy Friday as if they were consecutive — the
 * chart would read as steady trade when trade actually stopped. And a long custom range would
 * put a year of sub-pixel columns on a phone, so past six weeks this buckets into weeks.
 */
function buildBuckets(
  byDay: { date: string; income: number; orders: number }[],
  from: string,
  to: string,
  days: number
) {
  const income = new Map(byDay.map((d) => [d.date, d]));
  const daily: { date: string; income: number; orders: number }[] = [];
  for (let cursor = from, guard = 0; cursor <= to && guard < 800; cursor = shiftIsoDate(cursor, 1), guard++) {
    const hit = income.get(cursor);
    daily.push({ date: cursor, income: hit?.income ?? 0, orders: hit?.orders ?? 0 });
  }

  const short = (iso: string) => formatBusinessDate(iso).replace(/\s\d{4}$/, "");
  if (days <= 45) {
    return {
      unit: "day",
      data: daily.map((d) => ({
        date: d.date,
        label: formatBusinessDate(d.date),
        short: short(d.date),
        value: d.income,
        orders: d.orders,
      })),
    };
  }

  const weeks: { date: string; label: string; short: string; value: number; orders: number }[] = [];
  for (let i = 0; i < daily.length; i += 7) {
    const week = daily.slice(i, i + 7);
    const start = week[0].date;
    const end = week[week.length - 1].date;
    weeks.push({
      date: start,
      label: `${short(start)} – ${short(end)}`,
      short: short(start),
      value: week.reduce((n, d) => n + d.income, 0),
      orders: week.reduce((n, d) => n + d.orders, 0),
    });
  }
  return { unit: "week", data: weeks };
}
