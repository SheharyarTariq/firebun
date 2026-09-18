import "server-only";
import { cache } from "react";
import { asc, count, desc, eq, getTableColumns, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { inventoryItems, inventoryPurchases, recipes, stockMovements } from "@/db/schema";

/** true when the owner set a limit and stock is at or below it. */
const neededExpr = sql<boolean>`(${inventoryItems.lowStockThreshold} is not null and ${inventoryItems.currentQty} <= ${inventoryItems.lowStockThreshold})`;

export async function listInventoryItems() {
  return getDb()
    .select({ ...getTableColumns(inventoryItems), needed: neededExpr })
    .from(inventoryItems)
    .orderBy(desc(inventoryItems.isActive), desc(neededExpr), asc(inventoryItems.name));
}

export type InventoryListItem = Awaited<ReturnType<typeof listInventoryItems>>[number];

export interface InventoryAttention {
  /** Active items at or below their low-stock limit (tab badge). */
  needed: number;
  /** Active items whose ledger went below zero — a count is overdue (badge turns red). */
  negative: number;
}

export async function countInventoryAttention(): Promise<InventoryAttention> {
  const [row] = await getDb()
    .select({
      needed: count(sql`case when ${neededExpr} then 1 end`),
      negative: count(sql`case when ${inventoryItems.currentQty} < 0 then 1 end`),
    })
    .from(inventoryItems)
    .where(eq(inventoryItems.isActive, true));
  return { needed: row?.needed ?? 0, negative: row?.negative ?? 0 };
}

/** Memoised per request: generateMetadata and the page both call it. */
export const getInventoryItemDetails = cache(async (id: number) => {
  const db = getDb();
  const item = await db.query.inventoryItems.findFirst({
    where: eq(inventoryItems.id, id),
  });
  if (!item) return null;

  const [movements, purchases, [recipeRow]] = await Promise.all([
    db.query.stockMovements.findMany({
      where: eq(stockMovements.inventoryItemId, id),
      orderBy: [desc(stockMovements.createdAt), desc(stockMovements.id)],
      limit: 100,
      with: { createdByUser: { columns: { name: true } } },
    }),
    db.query.inventoryPurchases.findMany({
      where: eq(inventoryPurchases.inventoryItemId, id),
      orderBy: [desc(inventoryPurchases.purchasedAt), desc(inventoryPurchases.id)],
      limit: 50,
      with: { createdByUser: { columns: { name: true } } },
    }),
    db.select({ n: count() }).from(recipes).where(eq(recipes.inventoryItemId, id)),
  ]);

  // What blocks a delete, so the page can say so before the tap.
  const soldRows = movements.some((m) => m.type === "sale" || m.type === "sale_reversal");
  return { item, movements, purchases, recipeUses: recipeRow?.n ?? 0, usedInOrders: soldRows };
});

export type InventoryItemDetails = NonNullable<
  Awaited<ReturnType<typeof getInventoryItemDetails>>
>;
export type MovementRow = InventoryItemDetails["movements"][number];
export type PurchaseRow = InventoryItemDetails["purchases"][number];
