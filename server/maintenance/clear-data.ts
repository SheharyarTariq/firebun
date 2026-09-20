/**
 * TEMPORARY — setup tool, remove before the shop goes live.
 *
 * Empties the app so the owner can start from scratch after testing. Staff accounts and
 * the shop settings row survive (settings is a singleton every page reads).
 *
 * To remove this feature later, delete:
 *   server/maintenance/            (this folder)
 *   app/(app)/more/danger-zone-actions.ts
 *   components/more/danger-zone/
 * then drop <DangerZone /> and its import from app/(app)/more/page.tsx.
 */
import "server-only";
import { getDb } from "@/db";
import {
  dailyCounters,
  dealSlotOptions,
  dealSlots,
  expenses,
  inventoryItems,
  inventoryPurchases,
  menuCategories,
  menuItems,
  menuItemVariants,
  orderItems,
  orders,
  recipes,
  stockMovements,
} from "@/db/schema";

export interface ClearSummary {
  orders: number;
  purchases: number;
  movements: number;
  expenses: number;
  menuItems: number;
  inventoryItems: number;
}

export async function clearAllData(): Promise<ClearSummary> {
  return getDb().transaction(async (tx) => {
    // Children first: every foreign key is ON DELETE RESTRICT except the ones that hang
    // off a variant (recipes, deal slots and their options), which cascade.
    await tx.delete(orderItems).returning({ id: orderItems.id });
    const deletedOrders = await tx.delete(orders).returning({ id: orders.id });
    await tx.delete(dailyCounters).returning({ businessDate: dailyCounters.businessDate });

    const deletedMovements = await tx.delete(stockMovements).returning({ id: stockMovements.id });
    const deletedPurchases = await tx.delete(inventoryPurchases).returning({ id: inventoryPurchases.id });
    const deletedExpenses = await tx.delete(expenses).returning({ id: expenses.id });

    await tx.delete(recipes).returning({ id: recipes.id });
    await tx.delete(dealSlotOptions).returning({ id: dealSlotOptions.id });
    await tx.delete(dealSlots).returning({ id: dealSlots.id });
    await tx.delete(menuItemVariants).returning({ id: menuItemVariants.id });
    const deletedMenuItems = await tx.delete(menuItems).returning({ id: menuItems.id });
    await tx.delete(menuCategories).returning({ id: menuCategories.id });

    const deletedInventory = await tx.delete(inventoryItems).returning({ id: inventoryItems.id });

    return {
      orders: deletedOrders.length,
      purchases: deletedPurchases.length,
      movements: deletedMovements.length,
      expenses: deletedExpenses.length,
      menuItems: deletedMenuItems.length,
      inventoryItems: deletedInventory.length,
    };
  });
}
