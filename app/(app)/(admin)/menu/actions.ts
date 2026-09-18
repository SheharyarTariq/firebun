"use server";

import { revalidatePath } from "next/cache";
import {
  categorySchema,
  createMenuItemSchema,
  dealSlotSchema,
  recipeLineSchema,
  updateMenuItemSchema,
  variantSchema,
  type CategoryFormInput,
  type CreateMenuItemFormInput,
  type DealSlotFormInput,
  type RecipeLineFormInput,
  type UpdateMenuItemFormInput,
  type VariantFormInput,
} from "@/components/menu/schema";
import { requireAdmin } from "@/server/auth/dal";
import { ServiceError } from "@/server/errors";
import { getDb } from "@/db";
import { inventoryItems } from "@/db/schema";
import {
  addDealSlot,
  addVariant,
  copyRecipe,
  createCategory,
  createMenuItem,
  deleteCategory,
  deleteDealSlot,
  deleteMenuItem,
  deleteVariant,
  moveCategory,
  removeRecipeLine,
  setItemAvailability,
  setRecipeLine,
  updateCategory,
  updateDealSlot,
  updateMenuItem,
  updateVariant,
} from "@/server/menu/service";
import { runAction, validatedAction } from "@/server/run-action";
import type { ActionResult } from "@/utils/action-result";
import { entryQtyToBase } from "@/utils/helper";
import { eq } from "drizzle-orm";

/** Menu changes affect the admin list, item pages and (later) the counter. */
function revalidateMenu() {
  revalidatePath("/", "layout");
}

// --- Categories -------------------------------------------------------------

export async function createCategoryAction(
  input: CategoryFormInput
): Promise<ActionResult<{ id: number }>> {
  await requireAdmin();
  return validatedAction(categorySchema, input, async () => {
    const row = await createCategory(input.name);
    revalidateMenu();
    return { id: row.id };
  });
}

export async function updateCategoryAction(
  id: number,
  input: CategoryFormInput
): Promise<ActionResult<void>> {
  await requireAdmin();
  return validatedAction(categorySchema, input, async () => {
    await updateCategory(id, { name: input.name, isActive: input.isActive ?? true });
    revalidateMenu();
  });
}

export async function moveCategoryAction(
  id: number,
  direction: "up" | "down"
): Promise<ActionResult<void>> {
  await requireAdmin();
  return runAction(async () => {
    await moveCategory(id, direction);
    revalidateMenu();
  });
}

// --- Items ------------------------------------------------------------------

export async function createMenuItemAction(
  input: CreateMenuItemFormInput
): Promise<ActionResult<{ id: number }>> {
  await requireAdmin();
  return validatedAction(createMenuItemSchema, input, async () => {
    const row = await createMenuItem(input);
    revalidateMenu();
    return row;
  });
}

export async function updateMenuItemAction(
  id: number,
  input: UpdateMenuItemFormInput
): Promise<ActionResult<void>> {
  await requireAdmin();
  return validatedAction(updateMenuItemSchema, input, async () => {
    await updateMenuItem(id, input);
    revalidateMenu();
  });
}

export async function setItemAvailabilityAction(
  id: number,
  isAvailable: boolean
): Promise<ActionResult<void>> {
  await requireAdmin();
  return runAction(async () => {
    await setItemAvailability(id, isAvailable);
    revalidateMenu();
  });
}

// --- Variants ---------------------------------------------------------------

export async function addVariantAction(
  itemId: number,
  input: VariantFormInput
): Promise<ActionResult<{ id: number }>> {
  await requireAdmin();
  return validatedAction(variantSchema, input, async () => {
    const row = await addVariant(itemId, input);
    revalidateMenu();
    return { id: row.id };
  });
}

export async function updateVariantAction(
  id: number,
  input: VariantFormInput
): Promise<ActionResult<void>> {
  await requireAdmin();
  return validatedAction(variantSchema, input, async () => {
    await updateVariant(id, { ...input, isActive: input.isActive ?? true });
    revalidateMenu();
  });
}

export async function deleteVariantAction(id: number): Promise<ActionResult<void>> {
  await requireAdmin();
  return runAction(async () => {
    await deleteVariant(id);
    revalidateMenu();
  });
}

// --- Recipes ----------------------------------------------------------------

export async function setRecipeLineAction(
  variantId: number,
  input: RecipeLineFormInput
): Promise<ActionResult<void>> {
  await requireAdmin();
  return validatedAction(recipeLineSchema, input, async () => {
    const [ingredient] = await getDb()
      .select({
        baseUnit: inventoryItems.baseUnit,
        packSize: inventoryItems.packSize,
        packLabel: inventoryItems.packLabel,
      })
      .from(inventoryItems)
      .where(eq(inventoryItems.id, input.inventoryItemId));
    if (!ingredient) throw new ServiceError("Ingredient not found.", { inventoryItemId: "Unknown item" });

    let quantityBase: number;
    try {
      quantityBase = entryQtyToBase(ingredient, input.qty, input.unit);
    } catch {
      throw new ServiceError("That unit does not match the ingredient.", { unit: "Wrong unit" });
    }
    // The picked size first, then any sibling sizes ticked under "Also add to".
    const targets = [variantId, ...(input.alsoVariantIds ?? []).filter((id) => id !== variantId)];
    for (const target of targets) await setRecipeLine(target, input.inventoryItemId, quantityBase);
    revalidateMenu();
  });
}

export async function removeRecipeLineAction(id: number): Promise<ActionResult<void>> {
  await requireAdmin();
  return runAction(async () => {
    await removeRecipeLine(id);
    revalidateMenu();
  });
}

export async function copyRecipeAction(
  fromVariantId: number,
  toVariantId: number,
  options: { crossItem?: boolean } = {}
): Promise<ActionResult<void>> {
  await requireAdmin();
  return runAction(async () => {
    await copyRecipe(fromVariantId, toVariantId, options);
    revalidateMenu();
  });
}

// --- Deal slots -------------------------------------------------------------

export async function addDealSlotAction(
  dealVariantId: number,
  input: DealSlotFormInput
): Promise<ActionResult<{ id: number }>> {
  await requireAdmin();
  return validatedAction(dealSlotSchema, input, async () => {
    const row = await addDealSlot(dealVariantId, input);
    revalidateMenu();
    return { id: row.id };
  });
}

export async function updateDealSlotAction(
  slotId: number,
  input: DealSlotFormInput
): Promise<ActionResult<void>> {
  await requireAdmin();
  return validatedAction(dealSlotSchema, input, async () => {
    await updateDealSlot(slotId, input);
    revalidateMenu();
  });
}

export async function deleteDealSlotAction(slotId: number): Promise<ActionResult<void>> {
  await requireAdmin();
  return runAction(async () => {
    await deleteDealSlot(slotId);
    revalidateMenu();
  });
}

// --- Deletion ---------------------------------------------------------------

export async function deleteCategoryAction(id: number): Promise<ActionResult<void>> {
  await requireAdmin();
  return runAction(async () => {
    await deleteCategory(id);
    revalidateMenu();
  });
}

export async function deleteMenuItemAction(id: number): Promise<ActionResult<void>> {
  await requireAdmin();
  return runAction(async () => {
    await deleteMenuItem(id);
    revalidateMenu();
  });
}
