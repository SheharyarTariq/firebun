"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, ChevronLeft, ChevronRight, ReceiptText, X } from "lucide-react";
import Badge from "@/components/common/Badge";
import Banner from "@/components/common/Banner";
import Card from "@/components/common/Card";
import Chips from "@/components/common/Chips";
import EmptyState from "@/components/common/EmptyState";
import ListRow from "@/components/common/ListRow";
import SectionHeading from "@/components/common/SectionHeading";
import Link from "next/link";
import PageHeader from "@/components/layout/page-header";
import PageBody from "@/components/layout/page-body";
import HeroStat from "@/components/layout/page-header/hero-stat";
import type { OrderStatus } from "@/db/schema/orders";
import type { DaySummary, OrderListRow } from "@/server/orders/queries";
import { cn } from "@/utils/cn";
import { formatBusinessDate, formatMoney, formatOrderNumber, formatTime, shiftIsoDate, type DateRange } from "@/utils/helper";
import { routes } from "@/utils/routes";
import DateRangeSheet from "./date-range-sheet";
import { ORDER_TYPE_LABELS, STATUS_BADGE, STATUS_LABELS, lineLabel } from "./format";

type Filter = OrderStatus | "all";

interface OrdersScreenProps {
  /** Every order of the day (or range); the status chips filter locally. */
  orders: OrderListRow[];
  summary: DaySummary;
  /** Across every day, not just this one — the tab badge counts the same way. */
  unpaid: { orders: number; amount: number };
  businessDate: string;
  /** Set when a from/to span is on screen instead of one day. */
  range: DateRange | null;
  todayBusinessDate: string;
  initialStatus: Filter;
}

/** Orders grouped by business date, newest day first (the list arrives in that order). */
function groupByDay(rows: OrderListRow[]) {
  const days: { date: string; orders: OrderListRow[] }[] = [];
  for (const row of rows) {
    const last = days.at(-1);
    if (last?.date === row.businessDate) last.orders.push(row);
    else days.push({ date: row.businessDate, orders: [row] });
  }
  return days;
}

export default function OrdersScreen({ orders, summary, unpaid, businessDate, range, todayBusinessDate, initialStatus }: OrdersScreenProps) {
  const router = useRouter();
  const [status, setStatus] = useState<Filter>(initialStatus);
  // Bumped on each open so the sheet starts from what is on screen.
  const [pickerKey, setPickerKey] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const isToday = businessDate === todayBusinessDate;
  const isYesterday = businessDate === shiftIsoDate(todayBusinessDate, -1);
  const dayLabel = isToday ? "Today" : isYesterday ? "Yesterday" : formatBusinessDate(businessDate, "EEE d MMM");

  const goTo = (date: string) => {
    if (!date || date > todayBusinessDate) return;
    router.push(date === todayBusinessDate ? routes.ui.orders : `${routes.ui.orders}?date=${date}`);
  };

  const applyRange = (next: DateRange) => {
    setPickerOpen(false);
    if (next.from === next.to) goTo(next.from);
    else router.push(`${routes.ui.orders}?from=${next.from}&to=${next.to}`);
  };

  // "1 Sep – 30 Sep"; the year only when the span crosses one.
  const rangePattern = range && range.from.slice(0, 4) !== range.to.slice(0, 4) ? "d MMM yy" : "d MMM";
  const rangeLabel = range
    ? `${formatBusinessDate(range.from, rangePattern)} – ${formatBusinessDate(range.to, rangePattern)}`
    : null;

  const visible = status === "all" ? orders : orders.filter((o) => o.status === status);
  // A range shows one card per day: the order number restarts daily, so #1 alone is ambiguous.
  const groups = range ? groupByDay(visible) : [{ date: businessDate, orders: visible }];
  const dayCount = summary.completed + summary.pending;

  return (
    <>
      <PageHeader
        title="Orders"
        hero={
          <HeroStat
            figures={[
              { label: "Taken", value: formatMoney(summary.revenue), tone: "brand" },
              { label: `Order${dayCount === 1 ? "" : "s"}`, value: String(dayCount) },
              ...(summary.pending > 0
                ? [{ label: "Unpaid", value: String(summary.pending), tone: "warning" as const }]
                : []),
            ]}
          />
        }
        actions={
          <div className="flex items-center gap-0.5">
            {!range && (
              <button
                type="button"
                aria-label="Previous day"
                onClick={() => goTo(shiftIsoDate(businessDate, -1))}
                className="flex h-11 w-11 items-center justify-center rounded-full transition-colors active:bg-white/10"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            <button
              type="button"
              aria-label="Choose a day or date range"
              onClick={() => {
                setPickerKey((k) => k + 1);
                setPickerOpen(true);
              }}
              className="flex h-11 min-w-24 items-center justify-center gap-1.5 rounded-full px-2 text-sm font-medium transition-colors active:bg-white/10"
            >
              <CalendarDays className="h-4 w-4 text-ink-muted" />
              {rangeLabel ?? dayLabel}
            </button>
            {range ? (
              <button
                type="button"
                aria-label="Back to today"
                onClick={() => goTo(todayBusinessDate)}
                className="flex h-11 w-11 items-center justify-center rounded-full transition-colors active:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            ) : (
              <button
                type="button"
                aria-label="Next day"
                disabled={isToday}
                onClick={() => goTo(shiftIsoDate(businessDate, 1))}
                className="flex h-11 w-11 items-center justify-center rounded-full transition-colors active:bg-white/10 disabled:opacity-30"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            )}
          </div>
        }
      />

      <PageBody gap={3}>
        <Chips<Filter>
          wrap
          aria-label="Status"
          value={status}
          onChange={setStatus}
          options={[
            { value: "all", label: "All" },
            { value: "pending", label: "Unpaid", count: summary.pending },
            { value: "completed", label: "Paid", count: summary.completed },
            { value: "cancelled", label: "Cancelled", count: summary.cancelled },
          ]}
        />

        {/*
          * Deliberately the all-time figure, not this day's: a tab taken on Tuesday is still
          * owed on Friday, and the day view can never show it. The link is the only way to
          * reach those, and it is what the tab badge has always been counting.
          */}
        {unpaid.orders > 0 && (
          <Link href={routes.ui.unpaid} className="block">
            <Banner tone="warning" compact>
              {unpaid.orders} unpaid order{unpaid.orders === 1 ? "" : "s"} · {formatMoney(unpaid.amount)} owed — view
            </Banner>
          </Link>
        )}

        {visible.length === 0 ? (
          <EmptyState
            icon={ReceiptText}
            title={
              orders.length === 0
                ? range
                  ? "No orders in this period"
                  : isToday
                    ? "No orders yet today"
                    : "No orders on this day"
                : `No ${STATUS_LABELS[status as OrderStatus].toLowerCase()} orders`
            }
            description={orders.length === 0 && isToday && !range ? "Orders placed at the counter will appear here." : undefined}
          />
        ) : (
          groups.map((group) => (
            <section key={group.date} className="space-y-1.5">
              {range && (
                <SectionHeading>
                  {formatBusinessDate(group.date, "EEE d MMM")} · {group.orders.length} order{group.orders.length === 1 ? "" : "s"}
                </SectionHeading>
              )}
              <Card className="divide-y divide-border p-0">
                {group.orders.map((order) => (
                  <ListRow key={order.id} dense href={routes.ui.orderDetails(order.id)} trailing="chevron">
                    <span className="flex h-11 w-14 shrink-0 flex-col items-center justify-center rounded-field bg-surface-2 text-sm font-bold tabular-nums">
                      {formatOrderNumber(order.dailySeq)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">
                        {order.items.map((i) => `${i.quantity}× ${lineLabel(i.nameSnapshot, i.variantNameSnapshot)}`).join(", ")}
                      </span>
                      <span className="block text-xs text-muted">
                        {formatTime(order.createdAt)} · {ORDER_TYPE_LABELS[order.orderType]} · {order.createdByUser.name}
                        {order.customerPhone ? ` · ${order.customerPhone}` : ""}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <span className={cn("font-semibold tabular-nums", order.status === "cancelled" && "text-muted line-through")}>
                        {formatMoney(order.total)}
                      </span>
                      <Badge variant={STATUS_BADGE[order.status]}>{STATUS_LABELS[order.status]}</Badge>
                    </span>
                  </ListRow>
                ))}
              </Card>
            </section>
          ))
        )}
      </PageBody>

      <DateRangeSheet
        key={pickerKey}
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        businessDate={businessDate}
        range={range}
        todayBusinessDate={todayBusinessDate}
        onApply={applyRange}
      />
    </>
  );
}
