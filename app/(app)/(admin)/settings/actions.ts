"use server";

import { revalidatePath } from "next/cache";
import { settingsSchema, type SettingsFormInput } from "@/components/settings/schema";
import { requireAdmin } from "@/server/auth/dal";
import { validatedAction } from "@/server/run-action";
import { updateSettings } from "@/server/settings/service";
import type { ActionResult } from "@/utils/action-result";

export async function updateSettingsAction(input: SettingsFormInput): Promise<ActionResult<void>> {
  const user = await requireAdmin();
  return validatedAction(settingsSchema, input, async () => {
    await updateSettings(input, user.id);
    // Delivery default, staff caps and receipt text are read by the counter and every page.
    revalidatePath("/", "layout");
  });
}
