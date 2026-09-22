import "server-only";
import { cache } from "react";
import { and, asc, count, desc, eq, getTableColumns, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { inventoryItems, inventoryPurchases, menuItems, menuItemVariants, recipes, stockMovements } from "@/db/schema";

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

  const [movements, purchases, recipeUsages, [soldRow]] = await Promise.all([
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
    // Named, so a blocked delete can point at the recipes instead of just counting them,
    // and so archiving can warn when a sellable item would go on deducting this.
    db
      .select({
        menuItemId: menuItems.id,
        menuItemName: menuItems.name,
        variantName: menuItemVariants.name,
        isLive: sql<boolean>`(${menuItems.isActive} and ${menuItemVariants.isActive})`,
      })
      .from(recipes)
      .innerJoin(menuItemVariants, eq(menuItemVariants.id, recipes.variantId))
      .innerJoin(menuItems, eq(menuItems.id, menuItemVariants.menuItemId))
      .where(eq(recipes.inventoryItemId, id))
      .orderBy(asc(menuItems.name), asc(menuItemVariants.sortOrder)),
    // Counted in the database, not from `movements` above: that list stops at 100 rows, so a
    // busy item's older sales would drop out of it and the page would offer a delete that
    // the server then refuses.
    db
      .select({ n: count() })
      .from(stockMovements)
      .where(and(eq(stockMovements.inventoryItemId, id), inArray(stockMovements.type, ["sale", "sale_reversal"]))),
  ]);

  // What blocks a delete, so the page can say so before the tap.
  return { item, movements, purchases, recipeUsages, usedInOrders: (soldRow?.n ?? 0) > 0 };
});

export type InventoryItemDetails = NonNullable<
  Awaited<ReturnType<typeof getInventoryItemDetails>>
>;
export type MovementRow = InventoryItemDetails["movements"][number];
export type PurchaseRow = InventoryItemDetails["purchases"][number];
export type RecipeUsage = InventoryItemDetails["recipeUsages"][number];
