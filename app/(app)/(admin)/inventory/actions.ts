"use server";

import { revalidatePath } from "next/cache";
import {
  inventoryItemSchema,
  lowStockLimitsSchema,
  purchaseSchema,
  stockCountSchema,
  wastageSchema,
  type InventoryItemFormInput,
  type LowStockLimitsFormInput,
  type PurchaseFormInput,
  type StockCountFormInput,
  type WastageFormInput,
} from "@/components/inventory/schema";
import { requireAdmin } from "@/server/auth/dal";
import {
  createItem,
  deleteInventoryItem,
  deleteMovement,
  deletePurchase,
  recordPurchase,
  recordWastage,
  setLowStockLimits,
  setStockCount,
  updateItem,
} from "@/server/inventory/service";
import { runAction, validatedAction } from "@/server/run-action";
import type { ActionResult } from "@/utils/action-result";

/** Stock changes affect the list, the details page and the nav badge, so refresh everything. */
function revalidateInventory() {
  revalidatePath("/", "layout");
}

export async function createInventoryItemAction(
  input: InventoryItemFormInput
): Promise<ActionResult<{ id: number }>> {
  await requireAdmin();
  return validatedAction(inventoryItemSchema, input, async () => {
    const item = await createItem(input);
    revalidateInventory();
    return { id: item.id };
  });
}

export async function updateInventoryItemAction(
  id: number,
  input: InventoryItemFormInput
): Promise<ActionResult<void>> {
  await requireAdmin();
  return validatedAction(inventoryItemSchema, input, async () => {
    await updateItem(id, input);
    revalidateInventory();
  });
}

export async function recordPurchaseAction(
  input: PurchaseFormInput
): Promise<ActionResult<{ purchaseId: number; currentQty: number }>> {
  const user = await requireAdmin();
  return validatedAction(purchaseSchema, input, async () => {
    const result = await recordPurchase(input, user.id);
    revalidateInventory();
    return { purchaseId: result.purchaseId, currentQty: result.item.currentQty };
  });
}

export async function deletePurchaseAction(purchaseId: number): Promise<ActionResult<{ currentQty: number }>> {
  await requireAdmin();
  return runAction(async () => {
    const item = await deletePurchase(purchaseId);
    revalidateInventory();
    return { currentQty: item.currentQty };
  });
}

export async function deleteMovementAction(movementId: number): Promise<ActionResult<{ currentQty: number }>> {
  await requireAdmin();
  return runAction(async () => {
    const item = await deleteMovement(movementId);
    revalidateInventory();
    return { currentQty: item.currentQty };
  });
}

export async function deleteInventoryItemAction(id: number): Promise<ActionResult<void>> {
  await requireAdmin();
  return runAction(async () => {
    await deleteInventoryItem(id);
    revalidateInventory();
  });
}

export async function setStockCountAction(
  itemId: number,
  input: StockCountFormInput
): Promise<ActionResult<{ currentQty: number; delta: number }>> {
  const user = await requireAdmin();
  return validatedAction(stockCountSchema, input, async () => {
    const result = await setStockCount(itemId, input, user.id);
    revalidateInventory();
    return { currentQty: result.item.currentQty, delta: result.delta };
  });
}

export async function recordWastageAction(
  itemId: number,
  input: WastageFormInput
): Promise<ActionResult<{ currentQty: number }>> {
  const user = await requireAdmin();
  return validatedAction(wastageSchema, input, async () => {
    const item = await recordWastage(itemId, input, user.id);
    revalidateInventory();
    return { currentQty: item.currentQty };
  });
}

export async function setLowStockLimitsAction(input: LowStockLimitsFormInput): Promise<ActionResult<void>> {
  await requireAdmin();
  return validatedAction(lowStockLimitsSchema, input, async () => {
    await setLowStockLimits(input.limits);
    revalidateInventory();
  });
}
