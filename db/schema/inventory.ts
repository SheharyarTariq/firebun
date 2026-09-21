import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  pgTable,
  text,
} from "drizzle-orm/pg-core";
import {
  createdAt,
  id,
  money,
  quantity,
  timestampTz,
  unitCost,
  updatedAt,
} from "./_columns";
import { users } from "./users";

export const BASE_UNITS = ["g", "ml", "pcs"] as const;
export const DISPLAY_UNITS = ["kg", "g", "L", "ml", "pcs"] as const;
/** Units a quantity can be typed in: display units plus the item's own pack. */
export const ENTRY_UNITS = [...DISPLAY_UNITS, "pack"] as const;

export const inventoryItems = pgTable(
  "inventory_items",
  {
    id: id(),
    name: text().notNull(),
    /** Unit every quantity is stored in. Immutable once the item has movements. */
    baseUnit: text({ enum: BASE_UNITS }).notNull(),
    /** Unit the owner prefers to see (kg for flour, pcs for buns). */
    displayUnit: text({ enum: DISPLAY_UNITS }).notNull(),
    /** Optional pack the item is bought in, in base units (packet of 50 pcs, 5 kg bag). */
    packSize: quantity(),
    /** "packet", "bag", "carton" — shown wherever quantities can be typed in packs. */
    packLabel: text(),
    /** Cached Σ stock_movements.quantity_delta; updated in the same transaction. */
    currentQty: quantity().notNull().default(0),
    /** null = owner has not set a limit; item is never flagged as "needed". */
    lowStockThreshold: quantity(),
    /** Moving-average cost per base unit; null until the first costed movement. */
    avgCost: unitCost(),
    isActive: boolean().notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("inventory_items_active_name_idx").on(t.isActive, t.name),
    check("inventory_items_base_unit_check", sql`${t.baseUnit} in ('g', 'ml', 'pcs')`),
    check(
      "inventory_items_display_unit_check",
      sql`${t.displayUnit} in ('kg', 'g', 'L', 'ml', 'pcs')`
    ),
    check(
      "inventory_items_threshold_check",
      sql`${t.lowStockThreshold} is null or ${t.lowStockThreshold} >= 0`
    ),
    check("inventory_items_pack_size_check", sql`${t.packSize} is null or ${t.packSize} > 0`),
  ]
).enableRLS();

export const inventoryPurchases = pgTable(
  "inventory_purchases",
  {
    id: id(),
    inventoryItemId: integer()
      .notNull()
      .references(() => inventoryItems.id, { onDelete: "restrict" }),
    /** What the owner typed: 5 kg, or 2 packs */
    enteredQty: quantity().notNull(),
    enteredUnit: text({ enum: ENTRY_UNITS }).notNull(),
    /** Snapshot of the item's pack size (base units) when entered in packs. */
    packSize: quantity(),
    /** Converted to the item's base unit: 5000 g */
    quantityBase: quantity().notNull(),
    unitCost: unitCost().notNull(),
    totalCost: money().notNull(),
    supplier: text(),
    note: text(),
    /** Shop-local calendar date, for period reports. */
    purchaseDate: date({ mode: "string" }).notNull(),
    purchasedAt: timestampTz().notNull().defaultNow(),
    createdBy: integer()
      .notNull()
      .references(() => users.id),
    createdAt: createdAt(),
    voidedAt: timestampTz(),
    voidedBy: integer().references(() => users.id),
    voidReason: text(),
  },
  (t) => [
    index("inventory_purchases_date_idx").on(t.purchaseDate),
    index("inventory_purchases_item_time_idx").on(t.inventoryItemId, t.purchasedAt),
    check("inventory_purchases_qty_check", sql`${t.quantityBase} > 0`),
    check("inventory_purchases_cost_check", sql`${t.totalCost} >= 0`),
  ]
).enableRLS();

export const STOCK_MOVEMENT_TYPES = [
  "opening",
  "purchase",
  "purchase_void",
  "sale",
  "sale_reversal",
  "adjustment",
  "wastage",
] as const;
export type StockMovementType = (typeof STOCK_MOVEMENT_TYPES)[number];

export const MOVEMENT_REFERENCE_TYPES = ["order", "purchase", "manual"] as const;

/** The stock ledger. Every change to an item's quantity is a row here. */
export const stockMovements = pgTable(
  "stock_movements",
  {
    id: id(),
    inventoryItemId: integer()
      .notNull()
      .references(() => inventoryItems.id, { onDelete: "restrict" }),
    type: text({ enum: STOCK_MOVEMENT_TYPES }).notNull(),
    /** Signed: purchases positive, sales negative. */
    quantityDelta: quantity().notNull(),
    /** Cost per base unit at the time (avg_cost for sales, paid price for purchases). */
    unitCost: unitCost(),
    referenceType: text({ enum: MOVEMENT_REFERENCE_TYPES }),
    referenceId: integer(),
    note: text(),
    createdBy: integer()
      .notNull()
      .references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [
    index("stock_movements_item_time_idx").on(t.inventoryItemId, t.createdAt),
    index("stock_movements_reference_idx").on(t.referenceType, t.referenceId),
    index("stock_movements_type_time_idx").on(t.type, t.createdAt),
    check("stock_movements_delta_nonzero_check", sql`${t.quantityDelta} <> 0`),
    check(
      "stock_movements_sign_check",
      sql`(${t.type} in ('opening', 'purchase', 'sale_reversal') and ${t.quantityDelta} > 0)
        or (${t.type} in ('sale', 'purchase_void', 'wastage') and ${t.quantityDelta} < 0)
        or (${t.type} = 'adjustment')`
    ),
  ]
).enableRLS();

export type InventoryItem = typeof inventoryItems.$inferSelect;
export type InventoryPurchase = typeof inventoryPurchases.$inferSelect;
export type StockMovement = typeof stockMovements.$inferSelect;
