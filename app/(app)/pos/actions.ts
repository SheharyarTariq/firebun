"use server";

import { revalidatePath } from "next/cache";
import { placeOrderSchema } from "@/components/pos/schema";
import { getCurrentUser } from "@/server/auth/dal";
import { setItemAvailability } from "@/server/menu/service";
import { placeOrder, type PlaceOrderInput, type PlaceOrderResult } from "@/server/orders/service";
import { runAction, validatedAction } from "@/server/run-action";
import type { ActionResult } from "@/utils/action-result";

export async function placeOrderAction(
  input: PlaceOrderInput
): Promise<ActionResult<PlaceOrderResult>> {
  const user = await getCurrentUser();
  return validatedAction(placeOrderSchema, input, async () => {
    const result = await placeOrder(input, user);
    // Stock levels, the needed badge, the orders list and the pending badge all change.
    revalidatePath("/", "layout");
    return result;
  });
}

/** Sold-out toggle from the counter — staff may use it. */
export async function toggleItemAvailabilityAction(
  menuItemId: number,
  isAvailable: boolean
): Promise<ActionResult<void>> {
  await getCurrentUser();
  return runAction(async () => {
    await setItemAvailability(menuItemId, isAvailable);
    revalidatePath("/", "layout");
  });
}
