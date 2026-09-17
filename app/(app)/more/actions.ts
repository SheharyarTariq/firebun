"use server";

import {
  changePasswordSchema,
  type ChangePasswordFormInput,
} from "@/components/more/schema";
import { getCurrentUser } from "@/server/auth/dal";
import { createSession } from "@/server/auth/session";
import { validatedAction } from "@/server/run-action";
import { changeOwnPassword } from "@/server/users/service";
import type { ActionResult } from "@/utils/action-result";

export async function changePasswordAction(
  input: ChangePasswordFormInput
): Promise<ActionResult<void>> {
  const me = await getCurrentUser();
  return validatedAction(changePasswordSchema, input, async () => {
    const updated = await changeOwnPassword(me.id, input.currentPassword, input.newPassword);
    // The token version changed; re-issue this device's cookie so only other devices sign out.
    await createSession(updated);
  });
}
