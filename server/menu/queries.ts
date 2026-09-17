import "server-only";
import { cache } from "react";
import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  inventoryItems,
  menuCategories,
  menuItems,
  menuItemVariants,
} from "@/db/schema";

/** Whole menu for the admin list: categories → items → variants (+ recipe/slot counts). */
export async function listMenu() {
  return getDb().query.menuCategories.findMany({
    orderBy: [asc(menuCategories.sortOrder), asc(menuCategories.name)],
    with: {
      items: {
        orderBy: [asc(menuItems.sortOrder), asc(menuItems.name)],
        with: {
          variants: {
            orderBy: [asc(menuItemVariants.sortOrder), asc(menuItemVariants.id)],
            with: {
              recipes: { columns: { id: true } },
              dealSlots: { columns: { id: true } },
            },
          },
        },
      },
    },
  });
}

export type MenuCategoryWithItems = Awaited<ReturnType<typeof listMenu>>[number];
export type MenuListItem = MenuCategoryWithItems["items"][number];

export async function listCategories() {
  return getDb()
    .select()
    .from(menuCategories)
    .orderBy(asc(menuCategories.sortOrder), asc(menuCategories.name));
}

/** Active inventory items, minimal shape for the recipe editor. */
export async function listInventoryForRecipes() {
  return getDb()
    .select({
      id: inventoryItems.id,
      name: inventoryItems.name,
      baseUnit: inventoryItems.baseUnit,
      displayUnit: inventoryItems.displayUnit,
      packSize: inventoryItems.packSize,
      packLabel: inventoryItems.packLabel,
      avgCost: inventoryItems.avgCost,
      currentQty: inventoryItems.currentQty,
    })
    .from(inventoryItems)
    .where(eq(inventoryItems.isActive, true))
    .orderBy(asc(inventoryItems.name));
}

export type InventoryChoice = Awaited<ReturnType<typeof listInventoryForRecipes>>[number];

/** Every active size of every active single item — what a deal slot can offer. */
export async function listVariantChoices() {
  return getDb()
    .select({
      variantId: menuItemVariants.id,
      variantName: menuItemVariants.name,
      itemId: menuItems.id,
      itemName: menuItems.name,
      categoryId: menuCategories.id,
      categoryName: menuCategories.name,
      price: menuItemVariants.price,
    })
    .from(menuItemVariants)
    .innerJoin(menuItems, eq(menuItems.id, menuItemVariants.menuItemId))
    .innerJoin(menuCategories, eq(menuCategories.id, menuItems.categoryId))
    .where(
      and(
        eq(menuItemVariants.isActive, true),
        eq(menuItems.isActive, true),
        eq(menuItems.kind, "single")
      )
    )
    .orderBy(
      asc(menuCategories.sortOrder),
      asc(menuItems.sortOrder),
      asc(menuItems.name),
      asc(menuItemVariants.sortOrder)
    );
}

export type VariantChoice = Awaited<ReturnType<typeof listVariantChoices>>[number];

/** Memoised per request: generateMetadata and the page both call it. */
export const getMenuItemDetails = cache(async (id: number) => {
  const db = getDb();
  const item = await db.query.menuItems.findFirst({
    where: eq(menuItems.id, id),
    with: {
      category: true,
      variants: {
        orderBy: [asc(menuItemVariants.sortOrder), asc(menuItemVariants.id)],
        with: {
          recipes: {
            with: {
              inventoryItem: {
                columns: {
                  id: true,
                  name: true,
                  baseUnit: true,
                  displayUnit: true,
                  packSize: true,
                  packLabel: true,
                  avgCost: true,
                  isActive: true,
                },
              },
            },
          },
          dealSlots: {
            orderBy: (slots, { asc: ascFn }) => [ascFn(slots.sortOrder), ascFn(slots.id)],
            with: {
              options: {
                with: {
                  variant: {
                    columns: { id: true, name: true, isActive: true, price: true },
                    with: {
                      item: { columns: { id: true, name: true, isActive: true } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!item) return null;

  const [categories, inventory, variantChoices] = await Promise.all([
    listCategories(),
    listInventoryForRecipes(),
    item.kind === "deal" ? listVariantChoices() : Promise.resolve([] as VariantChoice[]),
  ]);

  return { item, categories, inventory, variantChoices };
});

export type MenuItemDetails = NonNullable<Awaited<ReturnType<typeof getMenuItemDetails>>>;
export type MenuItemFull = MenuItemDetails["item"];
export type VariantFull = MenuItemFull["variants"][number];
export type RecipeLine = VariantFull["recipes"][number];
export type DealSlotFull = VariantFull["dealSlots"][number];
