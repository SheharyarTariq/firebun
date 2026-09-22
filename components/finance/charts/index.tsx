import { cn } from "@/utils/cn";

/*
 * Small server-rendered charts. No charting library: these are three single-series figures on a
 * phone, and recharts and friends would force the whole report to `"use client"` and ship ~100KB
 * to draw bars a div can draw.
 *
 * Each chart is one series, so there is no categorical palette to get wrong — colour carries
 * meaning (money in / money out), and every bar is directly labelled, so nothing depends on
 * colour alone.
 */

interface BarChartProps {
  data: { key: string; label: string; value: number; sub?: string }[];
  /** Shown to the right of each bar. */
  format: (value: number) => string;
  tone?: "income" | "spend";
  /** Caps the rows drawn; the rest fold into a summary line. */
  limit?: number;
}

const TONE = {
  income: "bg-success",
  spend: "bg-warning",
} as const;

/**
 * Horizontal bars, sorted by whatever order the caller passes.
 *
 * Bars are proportional to the largest value rather than to the total: the question these answer
 * is "which of these is big", not "what share of a whole".
 */
export function BarList({ data, format, tone = "income", limit }: BarChartProps) {
  const shown = limit ? data.slice(0, limit) : data;
  const rest = limit ? data.slice(limit) : [];
  const max = Math.max(...data.map((d) => d.value), 0);

  return (
    <div className="space-y-2.5">
      {shown.map((d) => (
        <div key={d.key}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 flex-1 truncate text-body">
              {d.label}
              {d.sub && <span className="text-muted"> · {d.sub}</span>}
            </span>
            <span className="shrink-0 text-body money">{format(d.value)}</span>
          </div>
          <span aria-hidden className="mt-1 block h-1.5 overflow-hidden rounded-full bg-muted-bg">
            <span
              className={cn("block h-full rounded-full", TONE[tone])}
              // A zero-value row still shows a sliver, so the row never looks like a render bug.
              style={{ width: max > 0 ? `${Math.max(2, (d.value / max) * 100)}%` : "2%" }}
            />
          </span>
        </div>
      ))}
      {rest.length > 0 && (
        <p className="pt-1 text-label text-muted">
          + {rest.length} more, {format(rest.reduce((n, d) => n + d.value, 0))} in total
        </p>
      )}
    </div>
  );
}

interface ColumnChartProps {
  data: { date: string; label: string; short: string; value: number; orders: number }[];
  format: (value: number) => string;
  /** What one column covers — "day" or "week". */
  unit: string;
}

/**
 * Income over time, oldest on the left — the caller passes a gap-filled series in that order.
 * Time has to run left-to-right for a reader to see a trend at all.
 */
export function DayColumns({ data, format, unit }: ColumnChartProps) {
  const series = data;
  const max = Math.max(...series.map((d) => d.value), 0);
  const total = series.reduce((n, d) => n + d.value, 0);
  const best = series.reduce((a, b) => (b.value > a.value ? b : a), series[0]);

  return (
    <div className="space-y-3">
      <div className="flex h-28 items-end justify-between gap-px">
        {series.map((d) => (
          // h-full on the column, or the span's percentage height has nothing to resolve against
          // and every bar collapses to zero.
          <div
            key={d.date}
            className="flex h-full min-w-0 flex-1 flex-col justify-end"
            title={`${d.label} · ${format(d.value)} · ${d.orders} order${d.orders === 1 ? "" : "s"}`}
          >
            <span
              aria-hidden
              className={cn("mx-px block rounded-t", d.value > 0 ? "bg-success" : "bg-muted-bg")}
              style={{ height: max > 0 ? `${Math.max(2, (d.value / max) * 100)}%` : "2%" }}
            />
          </div>
        ))}
      </div>
      {/*
        * Only the ends and the best day get a label — a number under every column is unreadable
        * at 30 days on a phone, and these three are the ones that answer "how did it go".
        */}
      <div className="flex items-baseline justify-between gap-2 text-label text-muted">
        <span className="shrink-0">{series[0]?.short}</span>
        {best && best.value > 0 && (
          <span className="truncate text-foreground">
            Best {best.short} · <span className="money">{format(best.value)}</span>
          </span>
        )}
        <span className="shrink-0">{series[series.length - 1]?.short}</span>
      </div>
      <p className="sr-only">
        {series.map((d) => `${d.label}: ${format(d.value)}, ${d.orders} orders`).join(". ")}
      </p>
      <p className="text-label text-muted">
        {format(total)} over {series.length} {unit}
        {series.length === 1 ? "" : "s"} · {format(Math.round(total / series.length))} a {unit} on average
      </p>
    </div>
  );
}
