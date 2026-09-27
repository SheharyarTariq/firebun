import { Wallet } from "lucide-react";
import Badge from "@/components/common/Badge";
import Card from "@/components/common/Card";
import DataTable, { type DataColumn } from "@/components/common/DataTable";
import EmptyState from "@/components/common/EmptyState";
import DatasetHeader from "@/components/finance/dataset-header";
import Pager from "@/components/finance/pager";
import { FINANCE_PAGE_SIZE } from "@/server/finance/exports";
import type { ExpenseExportRow, getExpensesSummary } from "@/server/finance/queries";
import { formatBusinessDate, formatMoney, type DateRange, type PeriodPreset } from "@/utils/helper";
import { routes } from "@/utils/routes";

interface ExpensesTableProps {
  rows: ExpenseExportRow[];
  summary: Awaited<ReturnType<typeof getExpensesSummary>>;
  range: DateRange;
  preset: PeriodPreset;
  page: number;
}

/** Every expense in the period — the Expenses CSV, readable on the page. */
export default function ExpensesTable({ rows, summary, range, preset, page }: ExpensesTableProps) {
  const columns: DataColumn<ExpenseExportRow>[] = [
    {
      key: "expense",
      header: "Expense",
      cell: (e) => (
        <>
          <span className="block">{e.description}</span>
          <span className="block text-label text-muted">
            {formatBusinessDate(e.expenseDate, "d MMM")}
            {/* On a phone the category column is gone, so it rides along here. */}
            <span className="md:hidden"> · {e.category}</span>
          </span>
        </>
      ),
      footer: "Total · all pages",
    },
    { key: "category", header: "Category", desktopOnly: true, cell: (e) => <Badge>{e.category}</Badge> },
    { key: "by", header: "Added by", desktopOnly: true, cell: (e) => e.createdByUser.name },
    { key: "amount", header: "Amount", align: "right", cell: (e) => <span className="money">{formatMoney(e.amount)}</span>, footer: formatMoney(summary.total) },
  ];

  return (
    <>
      <DatasetHeader
        type="expenses"
        range={range}
        value={formatMoney(summary.total)}
        label={`${summary.rows} expense${summary.rows === 1 ? "" : "s"}`}
      />
      {rows.length === 0 ? (
        <Card>
          <EmptyState icon={Wallet} title="No expenses in this period" description="Pick another period above." />
        </Card>
      ) : (
        <DataTable caption="Expenses in the period" columns={columns} rows={rows} rowKey={(e) => e.id} />
      )}
      <Pager basePath={routes.ui.financeExpenses} preset={preset} range={range} page={page} pageSize={FINANCE_PAGE_SIZE} total={summary.rows} />
    </>
  );
}
