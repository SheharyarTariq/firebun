"use server";

import { revalidatePath } from "next/cache";
import {
  createUserSchema,
  resetPasswordSchema,
  type CreateUserFormInput,
  type ResetPasswordFormInput,
} from "@/components/users/schema";
import type { UserRole } from "@/db/schema/users";
import { requireAdmin } from "@/server/auth/dal";
import { runAction, validatedAction } from "@/server/run-action";
import { createUser, resetUserPassword, updateUser } from "@/server/users/service";
import type { ActionResult } from "@/utils/action-result";
import { routes } from "@/utils/routes";

export async function createUserAction(
  input: CreateUserFormInput
): Promise<ActionResult<{ id: number }>> {
  await requireAdmin();
  return validatedAction(createUserSchema, input, async () => {
    const row = await createUser(input);
    revalidatePath(routes.ui.users);
    return row;
  });
}

export async function updateUserAction(
  id: number,
  input: { name?: string; role?: UserRole; isActive?: boolean }
): Promise<ActionResult<void>> {
  const actor = await requireAdmin();
  return runAction(async () => {
    await updateUser(id, input, actor.id);
    revalidatePath(routes.ui.users);
  });
}

export async function resetUserPasswordAction(
  id: number,
  input: ResetPasswordFormInput
): Promise<ActionResult<void>> {
  await requireAdmin();
  return validatedAction(resetPasswordSchema, input, async () => {
    await resetUserPassword(id, input.password);
  });
}
