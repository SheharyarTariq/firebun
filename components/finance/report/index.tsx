import { Download } from "lucide-react";
import Badge from "@/components/common/Badge";
import Card from "@/components/common/Card";
import type { FinanceReport } from "@/server/finance/queries";
import { cn } from "@/utils/cn";
import { formatBusinessDate, formatMoney, rangeDays } from "@/utils/helper";
import { routes } from "@/utils/routes";

interface FinanceReportViewProps {
  report: FinanceReport;
}

/** The numbers for one period. Rendered on the server; no interactivity needed. */
export default function FinanceReportView({ report }: FinanceReportViewProps) {
  const { range, sales, purchases, expenses, pending } = report;
  const days = rangeDays(range);
  const spend = purchases.total + expenses.total;
  const grossMargin = sales.income > 0 ? Math.round(((sales.income - report.ingredientCost) / sales.income) * 100) : null;

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Tile label="Income" value={formatMoney(sales.income)} hint={`${sales.orders} paid order${sales.orders === 1 ? "" : "s"}`} tone="success" />
        <Tile label="Spend" value={formatMoney(spend)} hint={`${formatMoney(purchases.total)} stock · ${formatMoney(expenses.total)} expenses`} tone="warning" />
        <Tile label="Net" value={formatMoney(report.net)} hint="Income − spend (cash basis)" tone={report.net >= 0 ? "success" : "danger"} />
        <Tile label="Avg. order" value={formatMoney(sales.average)} hint={report.cancelled ? `${report.cancelled} cancelled` : "per paid order"} />
      </div>

      {pending.orders > 0 && (
        <p className="rounded-field bg-warning-bg px-4 py-2.5 text-sm text-warning">
          {pending.orders} unpaid delivery order{pending.orders === 1 ? "" : "s"} worth {formatMoney(pending.amount)} not counted yet.
        </p>
      )}

      <Card className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Sales</h2>
        <Row label="Food & drinks" value={formatMoney(sales.subtotal)} />
        {sales.discounts > 0 && <Row label="Discounts given" value={`− ${formatMoney(sales.discounts)}`} />}
        {sales.delivery > 0 && <Row label="Delivery charges" value={formatMoney(sales.delivery)} />}
        <Row label="Cash" value={formatMoney(sales.cash)} muted />
        <Row label="Online / transfer" value={formatMoney(sales.online)} muted />
        {sales.income > 0 && (
          <>
            <div className="border-t border-border" />
            <Row label="Ingredient cost (est.)" value={formatMoney(report.ingredientCost)} muted />
            {grossMargin !== null && (
              <Row label="Gross margin (est.)" value={`${grossMargin}%`} muted hint="Income minus ingredients used, from recipes" />
            )}
          </>
        )}
      </Card>

      <Card className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Spend</h2>
        <Row label={`Stock purchases (${purchases.count})`} value={formatMoney(purchases.total)} />
        <Row label={`Expenses (${expenses.count})`} value={formatMoney(expenses.total)} />
        {expenses.byCategory.map((c) => (
          <Row key={c.category} label={c.category} value={formatMoney(c.total)} muted indent />
        ))}
      </Card>

      {report.topItems.length > 0 && (
        <Card className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Top sellers</h2>
          <ol className="divide-y divide-border">
            {report.topItems.map((item, i) => (
              <li key={`${item.name}-${item.variant}`} className="flex items-center gap-3 py-2 text-sm">
                <span className="w-5 text-xs text-muted tabular-nums">{i + 1}.</span>
                <span className="min-w-0 flex-1 truncate">
                  {item.name}
                  {item.variant !== "Regular" && <span className="text-muted"> · {item.variant}</span>}
                </span>
                <Badge>{item.quantity}×</Badge>
                <span className="w-20 text-right font-medium tabular-nums">{formatMoney(item.revenue)}</span>
              </li>
            ))}
          </ol>
        </Card>
      )}

      {days > 1 && report.byDay.length > 0 && (
        <Card className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">By day</h2>
          <ul className="divide-y divide-border">
            {report.byDay.map((d) => (
              <li key={d.date} className="flex items-center justify-between py-2 text-sm">
                <span>{formatBusinessDate(d.date)}</span>
                <span className="text-xs text-muted">{d.orders} order{d.orders === 1 ? "" : "s"}</span>
                <span className="w-24 text-right font-medium tabular-nums">{formatMoney(d.income)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {report.recentPurchases.length > 0 && (
        <Card className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Stock purchases</h2>
          <ul className="divide-y divide-border">
            {report.recentPurchases.map((p) => (
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
        </Card>
      )}

      <Card className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Export (CSV)</h2>
        <div className="grid grid-cols-3 gap-2">
          {(["orders", "purchases", "expenses"] as const).map((type) => (
            <a
              key={type}
              href={routes.api.financeExport(type, range.from, range.to)}
              className="flex h-10 items-center justify-center gap-1.5 rounded-field border border-border text-sm font-medium capitalize transition-colors active:bg-surface-2"
            >
              <Download className="h-4 w-4" /> {type}
            </a>
          ))}
        </div>
      </Card>
    </>
  );
}

function Tile({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "success" | "warning" | "danger" }) {
  return (
    <Card className="space-y-1 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className={cn("text-xl font-bold tabular-nums", tone === "success" && "text-success", tone === "warning" && "text-warning", tone === "danger" && "text-danger")}>{value}</p>
      {hint && <p className="truncate text-xs text-muted">{hint}</p>}
    </Card>
  );
}

function Row({ label, value, muted, indent, hint }: { label: string; value: string; muted?: boolean; indent?: boolean; hint?: string }) {
  return (
    <div className={cn("flex items-baseline justify-between gap-3 text-sm", muted && "text-muted", indent && "pl-4")}>
      <span className="min-w-0">
        {label}
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
      <span className="shrink-0 font-medium tabular-nums">{value}</span>
    </div>
  );
}
