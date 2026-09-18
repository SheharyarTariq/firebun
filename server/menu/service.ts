import "server-only";
import { and, asc, count, eq, inArray, max, ne, sql } from "drizzle-orm";
import { getDb, type DbOrTx } from "@/db";
import {
  dealSlotOptions,
  dealSlots,
  inventoryItems,
  menuCategories,
  menuItems,
  menuItemVariants,
  orderItems,
  recipes,
  type MenuItemKind,
} from "@/db/schema";
import { ServiceError } from "@/server/errors";
import { roundMoney, slugify } from "@/utils/helper";

const round3 = (n: number) => Math.round((n + Number.EPSILON) * 1e3) / 1e3;

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export async function createCategory(name: string) {
  const db = getDb();
  const [{ m }] = await db.select({ m: max(menuCategories.sortOrder) }).from(menuCategories);
  const [row] = await db
    .insert(menuCategories)
    .values({ name: name.trim(), sortOrder: (m ?? -1) + 1 })
    .returning();
  return row;
}

export async function updateCategory(id: number, input: { name: string; isActive: boolean }) {
  const [row] = await getDb()
    .update(menuCategories)
    .set({ name: input.name.trim(), isActive: input.isActive })
    .where(eq(menuCategories.id, id))
    .returning();
  if (!row) throw new ServiceError("Category not found.");
  return row;
}

/** Swaps the category with its neighbour and renumbers sort_order 0..n-1. */
export async function moveCategory(id: number, direction: "up" | "down") {
  await getDb().transaction(async (tx) => {
    const all = await tx
      .select({ id: menuCategories.id })
      .from(menuCategories)
      .orderBy(asc(menuCategories.sortOrder), asc(menuCategories.name));
    const index = all.findIndex((c) => c.id === id);
    if (index < 0) throw new ServiceError("Category not found.");
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= all.length) return;

    const order = all.map((c) => c.id);
    [order[index], order[target]] = [order[target], order[index]];
    for (let i = 0; i < order.length; i++) {
      await tx.update(menuCategories).set({ sortOrder: i }).where(eq(menuCategories.id, order[i]));
    }
  });
}

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

export interface VariantInput {
  name: string;
  price: number;
}

export interface CreateMenuItemInput {
  categoryId: number;
  name: string;
  kind: MenuItemKind;
  description?: string | null;
  variants: VariantInput[];
}

function assertUniqueVariantNames(variants: VariantInput[]) {
  const seen = new Set<string>();
  for (const v of variants) {
    const key = v.name.trim().toLowerCase();
    if (!key) throw new ServiceError("Every size needs a name.", { variants: "Missing name" });
    if (seen.has(key)) {
      throw new ServiceError(`Size "${v.name.trim()}" is listed twice.`, {
        variants: "Duplicate size",
      });
    }
    seen.add(key);
  }
}

async function uniqueSlug(tx: DbOrTx, name: string, exceptId?: number): Promise<string> {
  const base = slugify(name) || "item";
  for (let n = 0; n < 50; n++) {
    const candidate = n === 0 ? base : `${base}-${n + 1}`;
    const [existing] = await tx
      .select({ id: menuItems.id })
      .from(menuItems)
      .where(
        exceptId
          ? and(eq(menuItems.slug, candidate), ne(menuItems.id, exceptId))
          : eq(menuItems.slug, candidate)
      );
    if (!existing) return candidate;
  }
  return `${base}-${Date.now()}`;
}

export async function createMenuItem(input: CreateMenuItemInput): Promise<{ id: number }> {
  if (input.variants.length === 0) {
    throw new ServiceError("Add at least one price.", { variants: "Required" });
  }
  assertUniqueVariantNames(input.variants);

  return getDb().transaction(async (tx) => {
    const [category] = await tx
      .select({ id: menuCategories.id })
      .from(menuCategories)
      .where(eq(menuCategories.id, input.categoryId));
    if (!category) throw new ServiceError("Pick a category.", { categoryId: "Unknown category" });

    const [{ m }] = await tx
      .select({ m: max(menuItems.sortOrder) })
      .from(menuItems)
      .where(eq(menuItems.categoryId, input.categoryId));

    const [item] = await tx
      .insert(menuItems)
      .values({
        categoryId: input.categoryId,
        name: input.name.trim(),
        kind: input.kind,
        slug: await uniqueSlug(tx, input.name),
        description: input.description?.trim() || null,
        sortOrder: (m ?? -1) + 1,
      })
      .returning({ id: menuItems.id });

    await tx.insert(menuItemVariants).values(
      input.variants.map((v, i) => ({
        menuItemId: item.id,
        name: v.name.trim(),
        price: roundMoney(v.price),
        sortOrder: i,
      }))
    );

    return item;
  });
}

export interface UpdateMenuItemInput {
  categoryId: number;
  name: string;
  description?: string | null;
  isActive: boolean;
  isAvailable: boolean;
  showOnPublicMenu: boolean;
}

export async function updateMenuItem(id: number, input: UpdateMenuItemInput) {
  return getDb().transaction(async (tx) => {
    const [existing] = await tx.select().from(menuItems).where(eq(menuItems.id, id)).for("update");
    if (!existing) throw new ServiceError("Menu item not found.");

    const [category] = await tx
      .select({ id: menuCategories.id })
      .from(menuCategories)
      .where(eq(menuCategories.id, input.categoryId));
    if (!category) throw new ServiceError("Pick a category.", { categoryId: "Unknown category" });

    const [row] = await tx
      .update(menuItems)
      .set({
        categoryId: input.categoryId,
        name: input.name.trim(),
        slug:
          existing.name.trim() === input.name.trim() && existing.slug
            ? existing.slug
            : await uniqueSlug(tx, input.name, id),
        description: input.description?.trim() || null,
        isActive: input.isActive,
        isAvailable: input.isAvailable,
        showOnPublicMenu: input.showOnPublicMenu,
        updatedAt: new Date(),
      })
      .where(eq(menuItems.id, id))
      .returning();
    return row;
  });
}

/** Sold-out toggle. Staff may call this from the counter. */
export async function setItemAvailability(id: number, isAvailable: boolean) {
  const [row] = await getDb()
    .update(menuItems)
    .set({ isAvailable, updatedAt: new Date() })
    .where(eq(menuItems.id, id))
    .returning({ id: menuItems.id, isAvailable: menuItems.isAvailable });
  if (!row) throw new ServiceError("Menu item not found.");
  return row;
}

// ---------------------------------------------------------------------------
// Variants (sizes)
// ---------------------------------------------------------------------------

async function assertVariantNameFree(
  tx: DbOrTx,
  itemId: number,
  name: string,
  exceptId?: number
) {
  const [dup] = await tx
    .select({ id: menuItemVariants.id })
    .from(menuItemVariants)
    .where(
      and(
        eq(menuItemVariants.menuItemId, itemId),
        sql`lower(${menuItemVariants.name}) = ${name.trim().toLowerCase()}`,
        exceptId ? ne(menuItemVariants.id, exceptId) : undefined
      )
    );
  if (dup) throw new ServiceError(`There is already a size called "${name.trim()}".`, { name: "Already used" });
}

export async function addVariant(itemId: number, input: VariantInput) {
  return getDb().transaction(async (tx) => {
    const [item] = await tx.select({ id: menuItems.id }).from(menuItems).where(eq(menuItems.id, itemId));
    if (!item) throw new ServiceError("Menu item not found.");
    await assertVariantNameFree(tx, itemId, input.name);
    const [{ m }] = await tx
      .select({ m: max(menuItemVariants.sortOrder) })
      .from(menuItemVariants)
      .where(eq(menuItemVariants.menuItemId, itemId));
    const [row] = await tx
      .insert(menuItemVariants)
      .values({
        menuItemId: itemId,
        name: input.name.trim(),
        price: roundMoney(input.price),
        sortOrder: (m ?? -1) + 1,
      })
      .returning();
    return row;
  });
}

export async function updateVariant(
  id: number,
  input: VariantInput & { isActive: boolean }
) {
  return getDb().transaction(async (tx) => {
    const [variant] = await tx.select().from(menuItemVariants).where(eq(menuItemVariants.id, id)).for("update");
    if (!variant) throw new ServiceError("Size not found.");
    await assertVariantNameFree(tx, variant.menuItemId, input.name, id);

    if (variant.isActive && !input.isActive) {
      const [{ n }] = await tx
        .select({ n: count() })
        .from(menuItemVariants)
        .where(
          and(
            eq(menuItemVariants.menuItemId, variant.menuItemId),
            eq(menuItemVariants.isActive, true),
            ne(menuItemVariants.id, id)
          )
        );
      if (n === 0) {
        throw new ServiceError("An item needs at least one active size. Mark the item sold out instead.");
      }
    }

    const [row] = await tx
      .update(menuItemVariants)
      .set({ name: input.name.trim(), price: roundMoney(input.price), isActive: input.isActive })
      .where(eq(menuItemVariants.id, id))
      .returning();
    return row;
  });
}

export async function deleteVariant(id: number) {
  await getDb().transaction(async (tx) => {
    const [variant] = await tx.select().from(menuItemVariants).where(eq(menuItemVariants.id, id)).for("update");
    if (!variant) throw new ServiceError("Size not found.");

    const [{ n: siblings }] = await tx
      .select({ n: count() })
      .from(menuItemVariants)
      .where(and(eq(menuItemVariants.menuItemId, variant.menuItemId), ne(menuItemVariants.id, id)));
    if (siblings === 0) throw new ServiceError("An item needs at least one size.");

    const [[{ n: inOrders }], [{ n: inDeals }]] = await Promise.all([
      tx.select({ n: count() }).from(orderItems).where(eq(orderItems.variantId, id)),
      tx.select({ n: count() }).from(dealSlotOptions).where(eq(dealSlotOptions.variantId, id)),
    ]);
    if (inOrders > 0 || inDeals > 0) {
      throw new ServiceError(
        inDeals > 0
          ? "This size is offered in a deal. Remove it from the deal first, or deactivate it."
          : "This size appears in past orders. Deactivate it instead of deleting."
      );
    }

    await tx.delete(menuItemVariants).where(eq(menuItemVariants.id, id)); // recipes cascade
  });
}

// ---------------------------------------------------------------------------
// Recipes
// ---------------------------------------------------------------------------

export async function setRecipeLine(variantId: number, inventoryItemId: number, quantityBase: number) {
  const qty = round3(quantityBase);
  if (!(qty > 0)) throw new ServiceError("Quantity must be more than 0.", { qty: "Must be more than 0" });

  return getDb().transaction(async (tx) => {
    const [variant] = await tx.select({ id: menuItemVariants.id }).from(menuItemVariants).where(eq(menuItemVariants.id, variantId));
    if (!variant) throw new ServiceError("Size not found.");
    const [ingredient] = await tx.select({ id: inventoryItems.id, isActive: inventoryItems.isActive }).from(inventoryItems).where(eq(inventoryItems.id, inventoryItemId));
    if (!ingredient) throw new ServiceError("Ingredient not found.", { inventoryItemId: "Unknown item" });
    if (!ingredient.isActive) throw new ServiceError("That inventory item is inactive.", { inventoryItemId: "Inactive" });

    const [row] = await tx
      .insert(recipes)
      .values({ variantId, inventoryItemId, quantity: qty })
      .onConflictDoUpdate({
        target: [recipes.variantId, recipes.inventoryItemId],
        set: { quantity: qty },
      })
      .returning();
    return row;
  });
}

export async function removeRecipeLine(id: number) {
  const [row] = await getDb().delete(recipes).where(eq(recipes.id, id)).returning({ id: recipes.id });
  if (!row) throw new ServiceError("Recipe line not found.");
}

/**
 * Replaces the target size's recipe with a copy of another size's. Sizes of the same item
 * by default; `crossItem` allows any single item (e.g. all pizzas share a base recipe).
 */
export async function copyRecipe(fromVariantId: number, toVariantId: number, options: { crossItem?: boolean } = {}) {
  if (fromVariantId === toVariantId) throw new ServiceError("Pick a different size to copy from.");
  await getDb().transaction(async (tx) => {
    const rows = await tx
      .select({ id: menuItemVariants.id, menuItemId: menuItemVariants.menuItemId })
      .from(menuItemVariants)
      .where(inArray(menuItemVariants.id, [fromVariantId, toVariantId]));
    if (rows.length !== 2) throw new ServiceError("Size not found.");
    if (!options.crossItem && rows[0].menuItemId !== rows[1].menuItemId) {
      throw new ServiceError("Recipes can only be copied between sizes of the same item.");
    }
    const source = await tx.select().from(recipes).where(eq(recipes.variantId, fromVariantId));
    if (source.length === 0) throw new ServiceError("That size has no recipe to copy.");

    await tx.delete(recipes).where(eq(recipes.variantId, toVariantId));
    await tx.insert(recipes).values(
      source.map((r) => ({ variantId: toVariantId, inventoryItemId: r.inventoryItemId, quantity: r.quantity }))
    );
  });
}

// ---------------------------------------------------------------------------
// Deals
// ---------------------------------------------------------------------------

export interface DealSlotInput {
  label: string;
  quantity: number;
  optionVariantIds: number[];
}

async function assertOptionsValid(tx: DbOrTx, ids: number[]) {
  const unique = [...new Set(ids)];
  if (unique.length === 0) throw new ServiceError("Pick at least one option.", { optionVariantIds: "Required" });
  const found = await tx
    .select({ id: menuItemVariants.id })
    .from(menuItemVariants)
    .innerJoin(menuItems, eq(menuItems.id, menuItemVariants.menuItemId))
    .where(and(inArray(menuItemVariants.id, unique), eq(menuItems.kind, "single")));
  if (found.length !== unique.length) {
    throw new ServiceError("One of the options is not a valid menu size.", { optionVariantIds: "Invalid option" });
  }
  return unique;
}

export async function addDealSlot(dealVariantId: number, input: DealSlotInput) {
  return getDb().transaction(async (tx) => {
    const [variant] = await tx
      .select({ id: menuItemVariants.id, kind: menuItems.kind })
      .from(menuItemVariants)
      .innerJoin(menuItems, eq(menuItems.id, menuItemVariants.menuItemId))
      .where(eq(menuItemVariants.id, dealVariantId));
    if (!variant) throw new ServiceError("Deal not found.");
    if (variant.kind !== "deal") throw new ServiceError("Only deals can have slots.");

    const ids = await assertOptionsValid(tx, input.optionVariantIds);
    const [{ m }] = await tx
      .select({ m: max(dealSlots.sortOrder) })
      .from(dealSlots)
      .where(eq(dealSlots.dealVariantId, dealVariantId));
    const [slot] = await tx
      .insert(dealSlots)
      .values({
        dealVariantId,
        label: input.label.trim(),
        quantity: Math.max(1, Math.round(input.quantity)),
        sortOrder: (m ?? -1) + 1,
      })
      .returning();
    await tx.insert(dealSlotOptions).values(ids.map((variantId) => ({ slotId: slot.id, variantId })));
    return slot;
  });
}

export async function updateDealSlot(slotId: number, input: DealSlotInput) {
  return getDb().transaction(async (tx) => {
    const [slot] = await tx.select().from(dealSlots).where(eq(dealSlots.id, slotId)).for("update");
    if (!slot) throw new ServiceError("Slot not found.");
    const ids = await assertOptionsValid(tx, input.optionVariantIds);

    await tx
      .update(dealSlots)
      .set({ label: input.label.trim(), quantity: Math.max(1, Math.round(input.quantity)) })
      .where(eq(dealSlots.id, slotId));
    await tx.delete(dealSlotOptions).where(eq(dealSlotOptions.slotId, slotId));
    await tx.insert(dealSlotOptions).values(ids.map((variantId) => ({ slotId, variantId })));
  });
}

export async function deleteDealSlot(slotId: number) {
  await getDb().transaction(async (tx) => {
    const [{ n }] = await tx.select({ n: count() }).from(orderItems).where(eq(orderItems.dealSlotId, slotId));
    if (n > 0) throw new ServiceError("This slot appears in past orders and cannot be deleted.");
    const [row] = await tx.delete(dealSlots).where(eq(dealSlots.id, slotId)).returning({ id: dealSlots.id });
    if (!row) throw new ServiceError("Slot not found.");
  });
}
