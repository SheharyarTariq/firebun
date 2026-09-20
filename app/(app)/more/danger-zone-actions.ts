"use server";

/**
 * TEMPORARY — setup tool, remove before the shop goes live. See server/maintenance/clear-data.ts
 * for the full removal checklist.
 *
 * Only async functions may be exported from a "use server" file, so the confirmation word
 * lives in the component next to the input that asks for it.
 */
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/server/auth/dal";
import { ServiceError } from "@/server/errors";
import { clearAllData, type ClearSummary } from "@/server/maintenance/clear-data";
import { runAction } from "@/server/run-action";
import type { ActionResult } from "@/utils/action-result";

const CONFIRMATION = "DELETE";

export async function clearDatabaseAction(confirmation: string): Promise<ActionResult<ClearSummary>> {
  await requireAdmin();
  return runAction(async () => {
    if (confirmation.trim() !== CONFIRMATION) {
      throw new ServiceError(`Type ${CONFIRMATION} to confirm.`, { confirmation: "Does not match" });
    }
    const summary = await clearAllData();
    revalidatePath("/", "layout");
    return summary;
  });
}
