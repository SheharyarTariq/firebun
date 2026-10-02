"use server";

import { revalidatePath } from "next/cache";
import {
  cancelOrderSchema,
  markPaidSchema,
  type CancelOrderFormInput,
  type MarkPaidFormInput,
} from "@/components/orders/schema";
import { getCurrentUser, requireAdmin } from "@/server/auth/dal";
import {
  cancelOrder,
  deleteOrder,
  markOrderPaid,
  markOrderUnpaid,
  updateOrderItems,
  type EditOrderInput,
  type EditOrderResult,
} from "@/server/orders/service";
import { runAction, validatedAction } from "@/server/run-action";
import type { ActionResult } from "@/utils/action-result";

export async function markOrderPaidAction(
  id: number,
  input: MarkPaidFormInput
): Promise<ActionResult<void>> {
  const user = await getCurrentUser();
  return validatedAction(markPaidSchema, input, async () => {
    await markOrderPaid(id, input.paymentMethod, user);
    revalidatePath("/", "layout");
  });
}

export async function cancelOrderAction(
  id: number,
  input: CancelOrderFormInput
): Promise<ActionResult<void>> {
  const user = await getCurrentUser();
  return validatedAction(cancelOrderSchema, input, async () => {
    await cancelOrder(id, input, user);
    revalidatePath("/", "layout");
  });
}

/** Admin only; the order must already be cancelled. */
export async function deleteOrderAction(id: number): Promise<ActionResult<void>> {
  await requireAdmin();
  return runAction(async () => {
    await deleteOrder(id);
    revalidatePath("/", "layout");
  });
}

/**
 * Correcting an order in place. Same rule as cancelling — the service checks it — because it
 * moves the same money and the same stock.
 */
export async function updateOrderItemsAction(
  id: number,
  input: EditOrderInput
): Promise<ActionResult<EditOrderResult>> {
  const user = await getCurrentUser();
  return runAction(async () => {
    const result = await updateOrderItems(id, input, user);
    revalidatePath("/", "layout");
    return result;
  });
}

/**
 * Undoes a payment that was never taken. Same rule as editing and cancelling — the service
 * checks it — because it moves the same money.
 */
export async function markOrderUnpaidAction(id: number): Promise<ActionResult<void>> {
  const user = await getCurrentUser();
  return runAction(async () => {
    await markOrderUnpaid(id, user);
    revalidatePath("/", "layout");
  });
}
