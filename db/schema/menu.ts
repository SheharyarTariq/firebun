import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createdAt, id, money, quantity, updatedAt } from "./_columns";
import { inventoryItems } from "./inventory";

export const menuCategories = pgTable("menu_categories", {
  id: id(),
  name: text().notNull(),
  sortOrder: integer().notNull().default(0),
  isActive: boolean().notNull().default(true),
  createdAt: createdAt(),
}).enableRLS();

export const MENU_ITEM_KINDS = ["single", "deal"] as const;
export type MenuItemKind = (typeof MENU_ITEM_KINDS)[number];

export const menuItems = pgTable(
  "menu_items",
  {
    id: id(),
    categoryId: integer()
      .notNull()
      .references(() => menuCategories.id, { onDelete: "restrict" }),
    name: text().notNull(),
    kind: text({ enum: MENU_ITEM_KINDS }).notNull().default("single"),
    /** For the future public landing page. */
    slug: text(),
    description: text(),
    imageUrl: text(),
    /** Sold-out toggle; staff may flip it. Independent of stock levels. */
    isAvailable: boolean().notNull().default(true),
    showOnPublicMenu: boolean().notNull().default(true),
    sortOrder: integer().notNull().default(0),
    isActive: boolean().notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("menu_items_slug_idx").on(t.slug).where(sql`${t.slug} is not null`),
    index("menu_items_category_sort_idx").on(t.categoryId, t.sortOrder),
    check("menu_items_kind_check", sql`${t.kind} in ('single', 'deal')`),
  ]
).enableRLS();

/**
 * Every item has at least one variant ("Regular" for single-price items,
 * S/M/L/XL for pizzas). The price and the recipe live on the variant.
 */
export const menuItemVariants = pgTable(
  "menu_item_variants",
  {
    id: id(),
    menuItemId: integer()
      .notNull()
      .references(() => menuItems.id, { onDelete: "restrict" }),
    name: text().notNull().default("Regular"),
    price: money().notNull(),
    sortOrder: integer().notNull().default(0),
    isActive: boolean().notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("menu_item_variants_item_name_idx").on(t.menuItemId, t.name),
    check("menu_item_variants_price_check", sql`${t.price} >= 0`),
  ]
).enableRLS();

/** Bill of materials: how much of each inventory item one unit of a variant consumes. */
export const recipes = pgTable(
  "recipes",
  {
    id: id(),
    variantId: integer()
      .notNull()
      .references(() => menuItemVariants.id, { onDelete: "cascade" }),
    inventoryItemId: integer()
      .notNull()
      .references(() => inventoryItems.id, { onDelete: "restrict" }),
    /** In the inventory item's base unit. */
    quantity: quantity().notNull(),
  },
  (t) => [
    uniqueIndex("recipes_variant_item_idx").on(t.variantId, t.inventoryItemId),
    check("recipes_quantity_check", sql`${t.quantity} > 0`),
  ]
).enableRLS();

/**
 * A deal is a menu item of kind "deal" whose variant owns slots. Each slot is
 * "N × <label>" and lists the variants the customer may choose from. A fixed
 * component is a slot with exactly one option.
 */
export const dealSlots = pgTable(
  "deal_slots",
  {
    id: id(),
    dealVariantId: integer()
      .notNull()
      .references(() => menuItemVariants.id, { onDelete: "cascade" }),
    label: text().notNull(),
    quantity: integer().notNull().default(1),
    sortOrder: integer().notNull().default(0),
  },
  (t) => [
    index("deal_slots_deal_idx").on(t.dealVariantId, t.sortOrder),
    check("deal_slots_quantity_check", sql`${t.quantity} > 0`),
  ]
).enableRLS();

export const dealSlotOptions = pgTable(
  "deal_slot_options",
  {
    id: id(),
    slotId: integer()
      .notNull()
      .references(() => dealSlots.id, { onDelete: "cascade" }),
    variantId: integer()
      .notNull()
      .references(() => menuItemVariants.id, { onDelete: "restrict" }),
  },
  (t) => [uniqueIndex("deal_slot_options_slot_variant_idx").on(t.slotId, t.variantId)]
).enableRLS();

export type MenuCategory = typeof menuCategories.$inferSelect;
export type MenuItem = typeof menuItems.$inferSelect;
export type MenuItemVariant = typeof menuItemVariants.$inferSelect;
export type Recipe = typeof recipes.$inferSelect;
export type DealSlot = typeof dealSlots.$inferSelect;
export type DealSlotOption = typeof dealSlotOptions.$inferSelect;
