import "server-only";
import {
  exportExpenses,
  exportOrders,
  exportPurchases,
  type ExpenseExportRow,
  type OrderExportRow,
  type PurchaseExportRow,
} from "@/server/finance/queries";
import type { DateRange } from "@/utils/helper";

export type FinanceDataset = "orders" | "purchases" | "expenses";

export const FINANCE_DATASETS: FinanceDataset[] = ["orders", "purchases", "expenses"];

/** Rows per page on the Finance tabs. */
export const FINANCE_PAGE_SIZE = 50;

const csvCell = (v: unknown): string => {
  if (v === null || v === undefined) return "";
  const s = v instanceof Date ? v.toISOString() : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

function toCsv<T>(rows: T[], columns: Record<string, (row: T) => unknown>): string {
  const keys = Object.keys(columns);
  const lines = [keys.join(",")];
  for (const row of rows) lines.push(keys.map((k) => csvCell(columns[k](row))).join(","));
  return lines.join("\n") + "\n";
}

const ORDER_COLUMNS: Record<string, (o: OrderExportRow) => unknown> = {
  date: (o) => o.businessDate,
  number: (o) => o.dailySeq,
  status: (o) => o.status,
  type: (o) => o.orderType,
  subtotal: (o) => o.subtotal,
  discount: (o) => o.discountAmount,
  delivery: (o) => o.deliveryCharge,
  total: (o) => o.total,
  payment: (o) => o.paymentMethod ?? "",
  customer_phone: (o) => o.customerPhone ?? "",
  staff: (o) => o.createdByUser.name,
  created_at: (o) => o.createdAt,
};

const PURCHASE_COLUMNS: Record<string, (p: PurchaseExportRow) => unknown> = {
  date: (p) => p.date,
  item: (p) => p.item,
  quantity: (p) => p.enteredQty,
  unit: (p) => p.enteredUnit,
  quantity_base: (p) => p.quantityBase,
  base_unit: (p) => p.baseUnit,
  total_cost: (p) => p.totalCost,
  supplier: (p) => p.supplier ?? "",
  note: (p) => p.note ?? "",
  voided: (p) => (p.voidedAt ? "yes" : ""),
};

const EXPENSE_COLUMNS: Record<string, (e: ExpenseExportRow) => unknown> = {
  date: (e) => e.expenseDate,
  category: (e) => e.category,
  amount: (e) => e.amount,
  description: (e) => e.description,
  added_by: (e) => e.createdByUser.name,
};

/** The whole period as CSV — the same rows the matching Finance tab pages through. */
export async function buildFinanceCsv(type: FinanceDataset, range: DateRange): Promise<string> {
  switch (type) {
    case "orders":
      return toCsv(await exportOrders(range), ORDER_COLUMNS);
    case "purchases":
      return toCsv(await exportPurchases(range), PURCHASE_COLUMNS);
    case "expenses":
      return toCsv(await exportExpenses(range), EXPENSE_COLUMNS);
  }
}

/** `?page=` → a 1-based page number and the matching window for the loaders. */
export function financePage(raw: string | undefined) {
  const parsed = Number.parseInt(raw ?? "", 10);
  const page = Number.isFinite(parsed) && parsed > 1 ? parsed : 1;
  return { page, window: { limit: FINANCE_PAGE_SIZE, offset: (page - 1) * FINANCE_PAGE_SIZE } };
}
