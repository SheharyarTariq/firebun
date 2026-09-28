"use server";

import { revalidatePath } from "next/cache";
import { customerSchema, type CustomerFormInput } from "@/components/customers/schema";
import { getCurrentUser, requireAdmin } from "@/server/auth/dal";
import { createCustomer, deleteCustomer, updateCustomer } from "@/server/customers/service";
import { listCustomersForPicker, searchCustomers } from "@/server/customers/queries";
import { runAction, validatedAction } from "@/server/run-action";
import type { ActionResult } from "@/utils/action-result";

/** Staff create customers too — it happens mid-order, at the counter. */
export async function createCustomerAction(input: CustomerFormInput): Promise<ActionResult<{ id: number }>> {
  await getCurrentUser();
  return validatedAction(customerSchema, input, async () => {
    const customer = await createCustomer(input);
    revalidatePath("/", "layout");
    return { id: customer.id };
  });
}

/** Editing someone's identity is an admin job, not something to do in a rush at the counter. */
export async function updateCustomerAction(
  id: number,
  input: CustomerFormInput
): Promise<ActionResult<void>> {
  await requireAdmin();
  return validatedAction(customerSchema, input, async () => {
    await updateCustomer(id, input);
    revalidatePath("/", "layout");
  });
}

export async function deleteCustomerAction(id: number): Promise<ActionResult<void>> {
  await requireAdmin();
  return runAction(async () => {
    await deleteCustomer(id);
    revalidatePath("/", "layout");
  });
}

export interface PickerCustomer {
  id: number;
  name: string | null;
  phone: string;
}

/** Typeahead for the counter; returns at most a handful of matches. */
export async function searchCustomersAction(query: string): Promise<ActionResult<PickerCustomer[]>> {
  await getCurrentUser();
  return runAction(async () => searchCustomers(query));
}

/**
 * The whole book, in dropdown order. The counter fetches this once when the picker is first
 * opened and filters it in the browser, so typing never waits on the network.
 */
export async function listCustomersAction(): Promise<ActionResult<PickerCustomer[]>> {
  await getCurrentUser();
  return runAction(async () => listCustomersForPicker());
}
