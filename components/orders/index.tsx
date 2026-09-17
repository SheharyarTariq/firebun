"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ReceiptText } from "lucide-react";
import Badge from "@/components/common/Badge";
import Card from "@/components/common/Card";
import Chips from "@/components/common/Chips";
import EmptyState from "@/components/common/EmptyState";
import Input from "@/components/common/Input";
import PageHeader from "@/components/layout/page-header";
import type { OrderStatus } from "@/db/schema/orders";
import type { DaySummary, OrderListRow } from "@/server/orders/queries";
import { cn } from "@/utils/cn";
import { formatDate, formatMoney, formatOrderNumber, formatTime, toIsoDate } from "@/utils/helper";
import { routes } from "@/utils/routes";
import { ORDER_TYPE_LABELS, STATUS_BADGE, STATUS_LABELS, lineLabel } from "./format";

type Filter = OrderStatus | "all";

interface OrdersScreenProps {
  orders: OrderListRow[];
  summary: DaySummary;
  businessDate: string;
  todayBusinessDate: string;
  status: Filter;
}

export default function OrdersScreen({ orders, summary, businessDate, todayBusinessDate, status }: OrdersScreenProps) {
  const router = useRouter();
  const isToday = businessDate === todayBusinessDate;

  const navigate = (next: { date?: string; status?: Filter }) => {
    const params = new URLSearchParams();
    const date = next.date ?? businessDate;
    const s = next.status ?? status;
    if (date !== todayBusinessDate) params.set("date", date);
    if (s !== "all") params.set("status", s);
    const qs = params.toString();
    router.push(qs ? `${routes.ui.orders}?${qs}` : routes.ui.orders);
  };

  return (
    <>
      <PageHeader
        title="Orders"
        subtitle={`${isToday ? "Today" : formatDate(`${businessDate}T12:00:00+05:00`)} · ${summary.completed + summary.pending} orders · ${formatMoney(summary.revenue)}`}
        actions={
          <Input
            type="date"
            aria-label="Business date"
            value={businessDate}
            max={toIsoDate()}
            onChange={(e) => e.target.value && navigate({ date: e.target.value })}
            className="h-9 w-36 px-2 text-sm"
            containerClassName="w-36"
          />
        }
      />

      <div className="space-y-3 p-4">
        <Chips<Filter>
          aria-label="Status"
          value={status}
          onChange={(s) => navigate({ status: s })}
          options={[
            { value: "all", label: "All" },
            { value: "pending", label: "Unpaid", count: summary.pending },
            { value: "completed", label: "Paid", count: summary.completed },
            { value: "cancelled", label: "Cancelled", count: summary.cancelled },
          ]}
        />

        {summary.pending > 0 && status === "all" && (
          <p className="rounded-field bg-warning-bg px-4 py-2.5 text-sm text-warning">
            {summary.pending} delivery order{summary.pending === 1 ? "" : "s"} waiting for payment ·{" "}
            {formatMoney(summary.pendingAmount)}
          </p>
        )}

        {orders.length === 0 ? (
          <EmptyState
            icon={ReceiptText}
            title={isToday ? "No orders yet today" : "No orders on this day"}
            description={isToday ? "Orders placed at the counter will appear here." : undefined}
          />
        ) : (
          <Card className="divide-y divide-border p-0">
            {orders.map((order) => (
              <Link
                key={order.id}
                href={routes.ui.orderDetails(order.id)}
                className="flex items-center gap-3 px-4 py-3 transition-colors active:bg-surface-2"
              >
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
              </Link>
            ))}
          </Card>
        )}
      </div>
    </>
  );
}
