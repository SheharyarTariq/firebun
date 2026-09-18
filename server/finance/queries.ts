import "server-only";
import { and, count, desc, eq, gte, isNull, lte, sql, sum } from "drizzle-orm";
import { getDb } from "@/db";
import {
  expenses,
  inventoryItems,
  inventoryPurchases,
  orderItems,
  orders,
  stockMovements,
} from "@/db/schema";
import { rangeDays, shiftIsoDate, type DateRange } from "@/utils/helper";

const n = (v: string | number | null | undefined) => Number(v ?? 0);

export interface FinanceReport {
  range: DateRange;
  sales: {
    orders: number;
    income: number;
    subtotal: number;
    discounts: number;
    delivery: number;
    cash: number;
    online: number;
    /** Average ticket: income ÷ orders. */
    average: number;
  };
  pending: { orders: number; amount: number };
  cancelled: number;
  purchases: { count: number; total: number };
  expenses: { count: number; total: number; byCategory: { category: string; total: number }[] };
  /** Ingredient cost of completed orders, from the sale movements' cost snapshots. */
  ingredientCost: number;
  /** Income − purchases − expenses: what actually left and entered the till. */
  net: number;
  /** Income − ingredient cost − expenses: an estimate that ignores when stock was bought. */
  profit: number;
  /** The same-length period just before this one, for "vs yesterday / last week". */
  previous: { range: DateRange; income: number; orders: number; profit: number };
  byDay: { date: string; orders: number; income: number }[];
  topItems: { name: string; variant: string; quantity: number; revenue: number }[];
  recentPurchases: { id: number; date: string; item: string; qty: number; unit: string; total: number; supplier: string | null; voided: boolean }[];
}

/** Income, ingredient cost and expenses for a range — enough for a headline comparison. */
async function getPeriodTotals(range: DateRange): Promise<{ income: number; orders: number; profit: number }> {
  const db = getDb();
  const completed = and(gte(orders.businessDate, range.from), lte(orders.businessDate, range.to), eq(orders.status, "completed"));
  const [[sales], [cogs], [spend]] = await Promise.all([
    db.select({ orders: count(), income: sum(orders.total) }).from(orders).where(completed),
    db
      .select({ cost: sql<string>`coalesce(sum(-${stockMovements.quantityDelta} * coalesce(${stockMovements.unitCost}, 0)), 0)` })
      .from(stockMovements)
      .innerJoin(orders, and(eq(stockMovements.referenceType, "order"), eq(stockMovements.referenceId, orders.id)))
      .where(and(completed, eq(stockMovements.type, "sale"))),
    db
      .select({ total: sum(expenses.amount) })
      .from(expenses)
      .where(and(gte(expenses.expenseDate, range.from), lte(expenses.expenseDate, range.to))),
  ]);
  const income = n(sales?.income);
  return { income, orders: sales?.orders ?? 0, profit: income - n(cogs?.cost) - n(spend?.total) };
}

/** The same number of days ending the day before `range` starts. */
export function previousRange(range: DateRange): DateRange {
  const days = rangeDays(range);
  return { from: shiftIsoDate(range.from, -days), to: shiftIsoDate(range.from, -1) };
}

/** What the More tab shows admins at a glance for today. */
export async function getTodaySnapshot(today: string) {
  const range = { from: today, to: today };
  const [totals, [pending]] = await Promise.all([
    getPeriodTotals(range),
    getDb()
      .select({ orders: count(), amount: sum(orders.total) })
      .from(orders)
      .where(and(eq(orders.businessDate, today), eq(orders.status, "pending"))),
  ]);
  return { ...totals, pendingOrders: pending?.orders ?? 0, pendingAmount: n(pending?.amount) };
}

export type TodaySnapshot = Awaited<ReturnType<typeof getTodaySnapshot>>;

export async function getFinanceReport(range: DateRange): Promise<FinanceReport> {
  const db = getDb();
  const inRange = and(gte(orders.businessDate, range.from), lte(orders.businessDate, range.to));
  const completed = and(inRange, eq(orders.status, "completed"));
  const prior = previousRange(range);

  const [
    [salesRow],
    [pendingRow],
    [cancelledRow],
    [purchaseRow],
    expenseRows,
    [cogsRow],
    byDayRows,
    topItemRows,
    purchaseRows,
    previous,
  ] = await Promise.all([
    db
      .select({
        orders: count(),
        income: sum(orders.total),
        subtotal: sum(orders.subtotal),
        discounts: sum(orders.discountAmount),
        delivery: sum(orders.deliveryCharge),
        cash: sql<string>`coalesce(sum(case when ${orders.paymentMethod} = 'cash' then ${orders.total} else 0 end), 0)`,
        online: sql<string>`coalesce(sum(case when ${orders.paymentMethod} = 'online' then ${orders.total} else 0 end), 0)`,
      })
      .from(orders)
      .where(completed),
    db
      .select({ orders: count(), amount: sum(orders.total) })
      .from(orders)
      .where(and(inRange, eq(orders.status, "pending"))),
    db.select({ orders: count() }).from(orders).where(and(inRange, eq(orders.status, "cancelled"))),
    db
      .select({ count: count(), total: sum(inventoryPurchases.totalCost) })
      .from(inventoryPurchases)
      .where(
        and(
          gte(inventoryPurchases.purchaseDate, range.from),
          lte(inventoryPurchases.purchaseDate, range.to),
          isNull(inventoryPurchases.voidedAt)
        )
      ),
    db
      .select({ category: expenses.category, count: count(), total: sum(expenses.amount) })
      .from(expenses)
      .where(and(gte(expenses.expenseDate, range.from), lte(expenses.expenseDate, range.to)))
      .groupBy(expenses.category)
      .orderBy(desc(sum(expenses.amount))),
    db
      .select({
        cost: sql<string>`coalesce(sum(-${stockMovements.quantityDelta} * coalesce(${stockMovements.unitCost}, 0)), 0)`,
      })
      .from(stockMovements)
      .innerJoin(orders, and(eq(stockMovements.referenceType, "order"), eq(stockMovements.referenceId, orders.id)))
      .where(and(completed, eq(stockMovements.type, "sale"))),
    db
      .select({ date: orders.businessDate, orders: count(), income: sum(orders.total) })
      .from(orders)
      .where(completed)
      .groupBy(orders.businessDate)
      .orderBy(desc(orders.businessDate)),
    db
      .select({
        name: orderItems.nameSnapshot,
        variant: orderItems.variantNameSnapshot,
        quantity: sum(orderItems.quantity),
        revenue: sum(orderItems.lineTotal),
      })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(and(completed, isNull(orderItems.parentOrderItemId)))
      .groupBy(orderItems.nameSnapshot, orderItems.variantNameSnapshot)
      .orderBy(desc(sum(orderItems.quantity)), desc(sum(orderItems.lineTotal)))
      .limit(10),
    db
      .select({
        id: inventoryPurchases.id,
        date: inventoryPurchases.purchaseDate,
        item: inventoryItems.name,
        qty: inventoryPurchases.enteredQty,
        unit: inventoryPurchases.enteredUnit,
        packLabel: inventoryItems.packLabel,
        total: inventoryPurchases.totalCost,
        supplier: inventoryPurchases.supplier,
        voidedAt: inventoryPurchases.voidedAt,
      })
      .from(inventoryPurchases)
      .innerJoin(inventoryItems, eq(inventoryItems.id, inventoryPurchases.inventoryItemId))
      .where(and(gte(inventoryPurchases.purchaseDate, range.from), lte(inventoryPurchases.purchaseDate, range.to)))
      .orderBy(desc(inventoryPurchases.purchasedAt), desc(inventoryPurchases.id))
      .limit(50),
    getPeriodTotals(prior),
  ]);

  const income = n(salesRow?.income);
  const purchasesTotal = n(purchaseRow?.total);
  const expensesTotal = expenseRows.reduce((acc, r) => acc + n(r.total), 0);
  const orderCount = salesRow?.orders ?? 0;

  return {
    range,
    sales: {
      orders: orderCount,
      income,
      subtotal: n(salesRow?.subtotal),
      discounts: n(salesRow?.discounts),
      delivery: n(salesRow?.delivery),
      cash: n(salesRow?.cash),
      online: n(salesRow?.online),
      average: orderCount > 0 ? Math.round(income / orderCount) : 0,
    },
    pending: { orders: pendingRow?.orders ?? 0, amount: n(pendingRow?.amount) },
    cancelled: cancelledRow?.orders ?? 0,
    purchases: { count: purchaseRow?.count ?? 0, total: purchasesTotal },
    expenses: {
      count: expenseRows.reduce((acc, r) => acc + r.count, 0),
      total: expensesTotal,
      byCategory: expenseRows.map((r) => ({ category: r.category, total: n(r.total) })),
    },
    ingredientCost: n(cogsRow?.cost),
    net: income - purchasesTotal - expensesTotal,
    profit: income - n(cogsRow?.cost) - expensesTotal,
    previous: { range: prior, ...previous },
    byDay: byDayRows.map((r) => ({ date: r.date, orders: r.orders, income: n(r.income) })),
    topItems: topItemRows.map((r) => ({ name: r.name, variant: r.variant, quantity: n(r.quantity), revenue: n(r.revenue) })),
    recentPurchases: purchaseRows.map((r) => ({
      id: r.id,
      date: r.date,
      item: r.item,
      qty: r.qty,
      unit: r.unit === "pack" ? (r.packLabel ?? "pack") : r.unit,
      total: r.total,
      supplier: r.supplier,
      voided: r.voidedAt !== null,
    })),
  };
}

/** Rows for CSV export (admin). */
export async function exportOrders(range: DateRange) {
  return getDb().query.orders.findMany({
    where: and(gte(orders.businessDate, range.from), lte(orders.businessDate, range.to)),
    orderBy: [orders.businessDate, orders.dailySeq],
    with: { createdByUser: { columns: { name: true } } },
  });
}

export async function exportPurchases(range: DateRange) {
  return getDb()
    .select({
      date: inventoryPurchases.purchaseDate,
      item: inventoryItems.name,
      enteredQty: inventoryPurchases.enteredQty,
      enteredUnit: inventoryPurchases.enteredUnit,
      quantityBase: inventoryPurchases.quantityBase,
      baseUnit: inventoryItems.baseUnit,
      totalCost: inventoryPurchases.totalCost,
      supplier: inventoryPurchases.supplier,
      note: inventoryPurchases.note,
      voidedAt: inventoryPurchases.voidedAt,
    })
    .from(inventoryPurchases)
    .innerJoin(inventoryItems, eq(inventoryItems.id, inventoryPurchases.inventoryItemId))
    .where(and(gte(inventoryPurchases.purchaseDate, range.from), lte(inventoryPurchases.purchaseDate, range.to)))
    .orderBy(inventoryPurchases.purchaseDate, inventoryPurchases.id);
}

export async function exportExpenses(range: DateRange) {
  return getDb().query.expenses.findMany({
    where: and(gte(expenses.expenseDate, range.from), lte(expenses.expenseDate, range.to)),
    orderBy: [expenses.expenseDate, expenses.id],
    with: { createdByUser: { columns: { name: true } } },
  });
}
