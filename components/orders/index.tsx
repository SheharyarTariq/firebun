"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, ChevronLeft, ChevronRight, ReceiptText } from "lucide-react";
import Badge from "@/components/common/Badge";
import Banner from "@/components/common/Banner";
import Card from "@/components/common/Card";
import Chips from "@/components/common/Chips";
import EmptyState from "@/components/common/EmptyState";
import ListRow from "@/components/common/ListRow";
import PageHeader from "@/components/layout/page-header";
import type { OrderStatus } from "@/db/schema/orders";
import type { DaySummary, OrderListRow } from "@/server/orders/queries";
import { cn } from "@/utils/cn";
import { formatBusinessDate, formatMoney, formatOrderNumber, formatTime, shiftIsoDate } from "@/utils/helper";
import { routes } from "@/utils/routes";
import { ORDER_TYPE_LABELS, STATUS_BADGE, STATUS_LABELS, lineLabel } from "./format";

type Filter = OrderStatus | "all";

interface OrdersScreenProps {
  /** Every order of the day; the status chips filter locally. */
  orders: OrderListRow[];
  summary: DaySummary;
  businessDate: string;
  todayBusinessDate: string;
  initialStatus: Filter;
}

export default function OrdersScreen({ orders, summary, businessDate, todayBusinessDate, initialStatus }: OrdersScreenProps) {
  const router = useRouter();
  const [status, setStatus] = useState<Filter>(initialStatus);
  const isToday = businessDate === todayBusinessDate;
  const isYesterday = businessDate === shiftIsoDate(todayBusinessDate, -1);
  const dayLabel = isToday ? "Today" : isYesterday ? "Yesterday" : formatBusinessDate(businessDate, "EEE d MMM");

  const goTo = (date: string) => {
    if (!date || date > todayBusinessDate) return;
    router.push(date === todayBusinessDate ? routes.ui.orders : `${routes.ui.orders}?date=${date}`);
  };

  const visible = status === "all" ? orders : orders.filter((o) => o.status === status);
  const dayCount = summary.completed + summary.pending;

  return (
    <>
      <PageHeader
        title="Orders"
        subtitle={
          summary.pending > 0
            ? `${summary.completed} paid · ${formatMoney(summary.revenue)} · ${summary.pending} unpaid`
            : `${dayCount} order${dayCount === 1 ? "" : "s"} · ${formatMoney(summary.revenue)}`
        }
        actions={
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              aria-label="Previous day"
              onClick={() => goTo(shiftIsoDate(businessDate, -1))}
              className="flex h-11 w-11 items-center justify-center rounded-full transition-colors active:bg-white/10"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <label className="relative flex h-11 min-w-24 cursor-pointer items-center justify-center gap-1.5 rounded-full px-2 text-sm font-medium transition-colors active:bg-white/10">
              <CalendarDays className="h-4 w-4 text-ink-muted" />
              {dayLabel}
              <input
                type="date"
                aria-label="Business date"
                value={businessDate}
                max={todayBusinessDate}
                onChange={(e) => goTo(e.target.value)}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </label>
            <button
              type="button"
              aria-label="Next day"
              disabled={isToday}
              onClick={() => goTo(shiftIsoDate(businessDate, 1))}
              className="flex h-11 w-11 items-center justify-center rounded-full transition-colors active:bg-white/10 disabled:opacity-30"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        }
      />

      <div className="space-y-3 p-4">
        <Chips<Filter>
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

        {summary.pending > 0 && status === "all" && (
          <Banner tone="warning" compact onClick={() => setStatus("pending")}>
            {summary.pending} delivery order{summary.pending === 1 ? "" : "s"} waiting for payment ·{" "}
            {formatMoney(summary.pendingAmount)}
          </Banner>
        )}

        {visible.length === 0 ? (
          <EmptyState
            icon={ReceiptText}
            title={
              orders.length === 0
                ? isToday
                  ? "No orders yet today"
                  : "No orders on this day"
                : `No ${STATUS_LABELS[status as OrderStatus].toLowerCase()} orders`
            }
            description={orders.length === 0 && isToday ? "Orders placed at the counter will appear here." : undefined}
          />
        ) : (
          <Card className="divide-y divide-border p-0">
            {visible.map((order) => (
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
        )}
      </div>
    </>
  );
}
