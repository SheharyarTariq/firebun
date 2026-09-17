import { getSession } from "@/server/auth/dal";
import { exportExpenses, exportOrders, exportPurchases } from "@/server/finance/queries";
import { isIsoDate } from "@/utils/helper";

const csvCell = (v: unknown): string => {
  if (v === null || v === undefined) return "";
  const s = v instanceof Date ? v.toISOString() : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

function toCsv(rows: Record<string, unknown>[], columns: string[]): string {
  const lines = [columns.join(",")];
  for (const row of rows) lines.push(columns.map((c) => csvCell(row[c])).join(","));
  return lines.join("\n") + "\n";
}

/** GET /api/finance/export?type=orders|purchases|expenses&from=yyyy-mm-dd&to=yyyy-mm-dd — admin only. */
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });
  if (session.role !== "admin") return new Response("Forbidden", { status: 403 });

  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if ((type !== "orders" && type !== "purchases" && type !== "expenses") || !isIsoDate(from) || !isIsoDate(to)) {
    return new Response("Bad request", { status: 400 });
  }

  const range = { from, to };
  let csv: string;
  if (type === "orders") {
    const rows = await exportOrders(range);
    csv = toCsv(
      rows.map((o) => ({
        date: o.businessDate,
        number: o.dailySeq,
        status: o.status,
        type: o.orderType,
        subtotal: o.subtotal,
        discount: o.discountAmount,
        delivery: o.deliveryCharge,
        total: o.total,
        payment: o.paymentMethod ?? "",
        customer_phone: o.customerPhone ?? "",
        staff: o.createdByUser.name,
        created_at: o.createdAt,
      })),
      ["date", "number", "status", "type", "subtotal", "discount", "delivery", "total", "payment", "customer_phone", "staff", "created_at"]
    );
  } else if (type === "purchases") {
    const rows = await exportPurchases(range);
    csv = toCsv(
      rows.map((p) => ({
        date: p.date,
        item: p.item,
        quantity: p.enteredQty,
        unit: p.enteredUnit,
        quantity_base: p.quantityBase,
        base_unit: p.baseUnit,
        total_cost: p.totalCost,
        supplier: p.supplier ?? "",
        note: p.note ?? "",
        voided: p.voidedAt ? "yes" : "",
      })),
      ["date", "item", "quantity", "unit", "quantity_base", "base_unit", "total_cost", "supplier", "note", "voided"]
    );
  } else {
    const rows = await exportExpenses(range);
    csv = toCsv(
      rows.map((e) => ({
        date: e.expenseDate,
        category: e.category,
        amount: e.amount,
        description: e.description,
        added_by: e.createdByUser.name,
      })),
      ["date", "category", "amount", "description", "added_by"]
    );
  }

  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="firebun-${type}-${from}-to-${to}.csv"`,
      "cache-control": "no-store",
    },
  });
}
