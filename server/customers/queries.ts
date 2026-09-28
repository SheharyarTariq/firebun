import "server-only";
import { cache } from "react";
import { and, count, desc, eq, ilike, or, sql, sum } from "drizzle-orm";
import { getDb } from "@/db";
import { customers, orders } from "@/db/schema";
import { normalisePhone } from "@/utils/helper";

/**
 * What a customer owes right now: the total of their orders that are still unpaid.
 * Cancelled orders are excluded — nobody owes for food that was never handed over.
 */
const owedExpr = sql<string>`coalesce(sum(case when ${orders.status} = 'pending' then ${orders.total} else 0 end), 0)`;
const spentExpr = sql<string>`coalesce(sum(case when ${orders.status} = 'completed' then ${orders.total} else 0 end), 0)`;

export interface CustomerRow {
  id: number;
  /** Null when the shop only has their number. */
  name: string | null;
  phone: string;
  note: string | null;
  /** Still unpaid, in rupees. */
  owed: number;
  /** Lifetime, settled orders only. */
  spent: number;
  orderCount: number;
  lastOrderAt: Date | null;
}

/**
 * Named customers sort alphabetically and number-only ones fall to the bottom — the order the
 * picker and the book both use, so a nameless entry never interrupts the alphabet.
 */
const byLabel = [sql`${customers.name} is null`, sql`lower(${customers.name})`, customers.phone];

/** The customer book: whoever owes money first, then alphabetically. */
export async function listCustomersWithBalance(): Promise<CustomerRow[]> {
  const rows = await getDb()
    .select({
      id: customers.id,
      name: customers.name,
      phone: customers.phone,
      note: customers.note,
      owed: owedExpr,
      spent: spentExpr,
      orderCount: count(orders.id),
      lastOrderAt: sql<Date | null>`max(${orders.createdAt})`,
    })
    .from(customers)
    .leftJoin(orders, eq(orders.customerId, customers.id))
    .groupBy(customers.id)
    .orderBy(desc(owedExpr), ...byLabel);

  return rows.map((r) => ({ ...r, owed: Number(r.owed), spent: Number(r.spent) }));
}

/**
 * The whole book for the counter picker, in dropdown order. Fetched once when the cashier
 * opens it and filtered in the browser after that, so typing costs no round trips.
 */
export async function listCustomersForPicker() {
  return getDb()
    .select({ id: customers.id, name: customers.name, phone: customers.phone })
    .from(customers)
    .orderBy(...byLabel);
}

/** Counter autocomplete: match on either the name or the phone, whichever they typed. */
export async function searchCustomers(query: string, limit = 8) {
  const text = query.trim();
  if (text.length < 2) return [];
  const digits = normalisePhone(text);

  return getDb()
    .select({ id: customers.id, name: customers.name, phone: customers.phone })
    .from(customers)
    .where(
      digits.length >= 3
        ? or(ilike(customers.name, `%${text}%`), ilike(customers.phone, `%${digits}%`))
        : ilike(customers.name, `%${text}%`)
    )
    .orderBy(...byLabel)
    .limit(limit);
}

export const getCustomerDetails = cache(async (id: number) => {
  const db = getDb();
  const customer = await db.query.customers.findFirst({ where: eq(customers.id, id) });
  if (!customer) return null;

  const [history, [totals]] = await Promise.all([
    db
      .select({
        id: orders.id,
        dailySeq: orders.dailySeq,
        businessDate: orders.businessDate,
        createdAt: orders.createdAt,
        status: orders.status,
        orderType: orders.orderType,
        total: orders.total,
      })
      .from(orders)
      .where(eq(orders.customerId, id))
      .orderBy(desc(orders.createdAt))
      .limit(100),
    db
      .select({ owed: owedExpr, spent: spentExpr, orderCount: count(orders.id) })
      .from(orders)
      .where(eq(orders.customerId, id)),
  ]);

  return {
    customer,
    history,
    owed: Number(totals?.owed ?? 0),
    spent: Number(totals?.spent ?? 0),
    orderCount: totals?.orderCount ?? 0,
  };
});

export type CustomerDetails = NonNullable<Awaited<ReturnType<typeof getCustomerDetails>>>;

/** Whether this customer still owes anything — the reason a delete can be refused. */
export async function countUnpaidOrdersFor(customerId: number): Promise<{ orders: number; amount: number }> {
  const [row] = await getDb()
    .select({ n: count(), amount: sum(orders.total) })
    .from(orders)
    .where(and(eq(orders.customerId, customerId), eq(orders.status, "pending")));
  return { orders: row?.n ?? 0, amount: Number(row?.amount ?? 0) };
}
