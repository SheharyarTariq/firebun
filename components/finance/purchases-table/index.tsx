import { PackageOpen } from "lucide-react";
import Badge from "@/components/common/Badge";
import Card from "@/components/common/Card";
import DataTable, { type DataColumn } from "@/components/common/DataTable";
import EmptyState from "@/components/common/EmptyState";
import DatasetHeader from "@/components/finance/dataset-header";
import Pager from "@/components/finance/pager";
import { FINANCE_PAGE_SIZE } from "@/server/finance/exports";
import type { getPurchasesSummary, PurchaseExportRow } from "@/server/finance/queries";
import { cn } from "@/utils/cn";
import { formatBusinessDate, formatMoney, formatQty, type DateRange, type PeriodPreset } from "@/utils/helper";
import { routes } from "@/utils/routes";

interface PurchasesTableProps {
  rows: PurchaseExportRow[];
  summary: Awaited<ReturnType<typeof getPurchasesSummary>>;
  range: DateRange;
  preset: PeriodPreset;
  page: number;
}

/** Every stock purchase in the period — the Purchases CSV, readable on the page. */
export default function PurchasesTable({ rows, summary, range, preset, page }: PurchasesTableProps) {
  const counted = summary.rows - summary.voided;

  const columns: DataColumn<PurchaseExportRow>[] = [
    {
      key: "item",
      header: "Item",
      cell: (p) => (
        <>
          <span className={cn("block font-medium", p.voidedAt && "line-through")}>{p.item}</span>
          <span className="block text-label text-muted">
            {formatBusinessDate(p.date, "d MMM")}
            {p.supplier && <span className="md:hidden"> · {p.supplier}</span>}
            {p.voidedAt && (
              <>
                {" "}
                <Badge variant="danger">Voided</Badge>
              </>
            )}
          </span>
        </>
      ),
      footer: "Total · all pages",
    },
    {
      key: "qty",
      header: "Qty",
      align: "right",
      className: "whitespace-nowrap",
      cell: (p) => `${p.enteredQty} ${p.enteredUnit === "pack" ? (p.packLabel ?? "pack") : p.enteredUnit}`,
    },
    {
      key: "base",
      header: "In stock units",
      align: "right",
      className: "whitespace-nowrap text-muted",
      desktopOnly: true,
      cell: (p) => formatQty(p.quantityBase, p.baseUnit),
    },
    { key: "supplier", header: "Supplier", desktopOnly: true, cell: (p) => p.supplier ?? "—" },
    { key: "note", header: "Note", desktopOnly: true, className: "max-w-64 text-muted", cell: (p) => p.note ?? "—" },
    {
      key: "total",
      header: "Cost",
      align: "right",
      cell: (p) => <span className={cn("money", p.voidedAt && "line-through")}>{formatMoney(p.totalCost)}</span>,
      footer: formatMoney(summary.total),
    },
  ];

  return (
    <>
      <DatasetHeader
        type="purchases"
        range={range}
        value={formatMoney(summary.total)}
        label={`${counted} purchase${counted === 1 ? "" : "s"}`}
        meta={summary.voided > 0 ? `${summary.voided} voided — not counted` : undefined}
      />
      {rows.length === 0 ? (
        <Card>
          <EmptyState icon={PackageOpen} title="No stock bought in this period" description="Pick another period above." />
        </Card>
      ) : (
        <DataTable
          caption="Stock purchases in the period"
          columns={columns}
          rows={rows}
          rowKey={(p) => p.id}
          rowHref={(p) => routes.ui.inventoryItemDetails(p.itemId)}
          rowClassName={(p) => (p.voidedAt ? "text-muted" : undefined)}
        />
      )}
      <Pager basePath={routes.ui.financePurchases} preset={preset} range={range} page={page} pageSize={FINANCE_PAGE_SIZE} total={summary.rows} />
    </>
  );
}
