"use server";

import { revalidatePath } from "next/cache";
import {
  cancelOrderSchema,
  markPaidSchema,
  type CancelOrderFormInput,
  type MarkPaidFormInput,
} from "@/components/orders/schema";
import { getCurrentUser } from "@/server/auth/dal";
import { cancelOrder, markOrderPaid } from "@/server/orders/service";
import { validatedAction } from "@/server/run-action";
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
