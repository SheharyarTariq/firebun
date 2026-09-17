import "server-only";
import { cache } from "react";
import { and, asc, count, desc, eq, getTableColumns, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { inventoryItems, inventoryPurchases, stockMovements } from "@/db/schema";

/** true when the owner set a limit and stock is at or below it. */
const neededExpr = sql<boolean>`(${inventoryItems.lowStockThreshold} is not null and ${inventoryItems.currentQty} <= ${inventoryItems.lowStockThreshold})`;

export async function listInventoryItems() {
  return getDb()
    .select({ ...getTableColumns(inventoryItems), needed: neededExpr })
    .from(inventoryItems)
    .orderBy(desc(inventoryItems.isActive), desc(neededExpr), asc(inventoryItems.name));
}

export type InventoryListItem = Awaited<ReturnType<typeof listInventoryItems>>[number];

export async function countNeededItems(): Promise<number> {
  const [row] = await getDb()
    .select({ n: count() })
    .from(inventoryItems)
    .where(and(eq(inventoryItems.isActive, true), neededExpr));
  return row?.n ?? 0;
}

/** Memoised per request: generateMetadata and the page both call it. */
export const getInventoryItemDetails = cache(async (id: number) => {
  const db = getDb();
  const item = await db.query.inventoryItems.findFirst({
    where: eq(inventoryItems.id, id),
  });
  if (!item) return null;

  const [movements, purchases] = await Promise.all([
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
  ]);

  return { item, movements, purchases };
});

export type InventoryItemDetails = NonNullable<
  Awaited<ReturnType<typeof getInventoryItemDetails>>
>;
export type MovementRow = InventoryItemDetails["movements"][number];
export type PurchaseRow = InventoryItemDetails["purchases"][number];
