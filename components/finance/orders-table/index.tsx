import { ReceiptText } from "lucide-react";
import Badge from "@/components/common/Badge";
import Card from "@/components/common/Card";
import DataTable, { type DataColumn } from "@/components/common/DataTable";
import EmptyState from "@/components/common/EmptyState";
import DatasetHeader from "@/components/finance/dataset-header";
import Pager from "@/components/finance/pager";
import { ORDER_TYPE_LABELS, PAYMENT_LABELS, STATUS_BADGE, STATUS_LABELS } from "@/components/orders/format";
import { FINANCE_PAGE_SIZE } from "@/server/finance/exports";
import type { getOrdersSummary, OrderExportRow } from "@/server/finance/queries";
import { formatBusinessDate, formatMoney, formatTime, type DateRange, type PeriodPreset } from "@/utils/helper";
import { routes } from "@/utils/routes";

interface OrdersTableProps {
  rows: OrderExportRow[];
  summary: Awaited<ReturnType<typeof getOrdersSummary>>;
  range: DateRange;
  preset: PeriodPreset;
  page: number;
}

/** Every order in the period — the Orders CSV, readable on the page. */
export default function OrdersTable({ rows, summary, range, preset, page }: OrdersTableProps) {
  const others = [
    summary.pending > 0 && `${summary.pending} unpaid`,
    summary.cancelled > 0 && `${summary.cancelled} cancelled`,
  ].filter(Boolean);

  const columns: DataColumn<OrderExportRow>[] = [
    {
      key: "order",
      header: "Order",
      cell: (o) => (
        <>
          <span className="block font-semibold">#{o.dailySeq}</span>
          <span className="block text-label whitespace-nowrap text-muted">
            {formatBusinessDate(o.businessDate, "d MMM")} · {formatTime(o.createdAt)}
          </span>
        </>
      ),
      footer: "Paid · all pages",
    },
    { key: "type", header: "Type", cell: (o) => ORDER_TYPE_LABELS[o.orderType], desktopOnly: true },
    { key: "payment", header: "Payment", cell: (o) => (o.paymentMethod ? PAYMENT_LABELS[o.paymentMethod] : "—"), desktopOnly: true },
    { key: "status", header: "Status", cell: (o) => <Badge variant={STATUS_BADGE[o.status]}>{STATUS_LABELS[o.status]}</Badge> },
    { key: "staff", header: "Staff", cell: (o) => o.createdByUser.name, desktopOnly: true },
    { key: "phone", header: "Phone", cell: (o) => o.customerPhone ?? "—", desktopOnly: true, className: "whitespace-nowrap" },
    { key: "subtotal", header: "Items", align: "right", cell: (o) => formatMoney(o.subtotal), desktopOnly: true, footer: formatMoney(summary.subtotal) },
    {
      key: "discount",
      header: "Discount",
      align: "right",
      cell: (o) => (o.discountAmount > 0 ? `− ${formatMoney(o.discountAmount)}` : "—"),
      desktopOnly: true,
      footer: summary.discount > 0 ? `− ${formatMoney(summary.discount)}` : "—",
    },
    {
      key: "delivery",
      header: "Delivery",
      align: "right",
      cell: (o) => (o.deliveryCharge > 0 ? formatMoney(o.deliveryCharge) : "—"),
      desktopOnly: true,
      footer: summary.delivery > 0 ? formatMoney(summary.delivery) : "—",
    },
    { key: "total", header: "Total", align: "right", cell: (o) => <span className="money">{formatMoney(o.total)}</span>, footer: formatMoney(summary.total) },
  ];

  return (
    <>
      <DatasetHeader
        type="orders"
        range={range}
        value={formatMoney(summary.total)}
        label={`${summary.paid} paid order${summary.paid === 1 ? "" : "s"}`}
        meta={others.length > 0 ? `${others.join(" · ")} — not counted` : undefined}
      />
      {rows.length === 0 ? (
        <Card>
          <EmptyState icon={ReceiptText} title="No orders in this period" description="Pick another period above." />
        </Card>
      ) : (
        <DataTable
          caption="Orders in the period"
          columns={columns}
          rows={rows}
          rowKey={(o) => o.id}
          rowHref={(o) => routes.ui.orderDetails(o.id)}
          rowClassName={(o) => (o.status === "cancelled" ? "text-muted" : undefined)}
        />
      )}
      <Pager basePath={routes.ui.financeOrders} preset={preset} range={range} page={page} pageSize={FINANCE_PAGE_SIZE} total={summary.rows} />
    </>
  );
}
