import "server-only";
import { asc, count, eq, isNotNull, and } from "drizzle-orm";
import { getDb, type DbOrTx } from "@/db";
import {
  inventoryItems,
  inventoryPurchases,
  stockMovements,
  type InventoryItem,
  type StockMovementType,
} from "@/db/schema";
import { ServiceError } from "@/server/errors";
import {
  entryQtyToBase,
  isUnitCompatible,
  roundMoney,
  toIsoDate,
  type BaseUnit,
  type DisplayUnit,
  type EntryUnit,
} from "@/utils/helper";
import { config } from "@/config";

const round3 = (n: number) => Math.round((n + Number.EPSILON) * 1e3) / 1e3;
const round6 = (n: number) => Math.round((n + Number.EPSILON) * 1e6) / 1e6;

/** Moving average per base unit. A purchase into empty/negative stock resets the average. */
function nextAvgCost(
  oldQty: number,
  oldAvg: number | null,
  qty: number,
  cost: number
): number {
  if (oldQty <= 0 || oldAvg === null) return round6(cost);
  return round6((oldQty * oldAvg + qty * cost) / (oldQty + qty));
}

async function lockItem(tx: DbOrTx, id: number): Promise<InventoryItem> {
  const [item] = await tx
    .select()
    .from(inventoryItems)
    .where(eq(inventoryItems.id, id))
    .for("update");
  if (!item) throw new ServiceError("Inventory item not found.");
  return item;
}

/** Typed quantity (kg / pcs / packs) → base units, as a field error when it cannot convert. */
function toBase(item: InventoryItem, qty: number, unit: EntryUnit, field: string): number {
  if (unit === "pack" && !item.packSize) {
    throw new ServiceError("This item has no pack size. Edit the item to add one.", {
      [field]: "No pack size",
    });
  }
  if (unit !== "pack" && !isUnitCompatible(unit, item.baseUnit)) {
    throw new ServiceError(`${unit} does not match this item's unit (${item.baseUnit}).`, {
      [field]: "Wrong unit",
    });
  }
  return round3(entryQtyToBase(item, qty, unit));
}

// ---------------------------------------------------------------------------
// Ledger
// ---------------------------------------------------------------------------

export interface MovementInput {
  itemId: number;
  type: StockMovementType;
  /** Signed quantity in base units. */
  delta: number;
  /**
   * Cost per base unit at the time; required for purchase/opening to affect the average.
   * `"current"` snapshots the item's average cost (sales, wastage, adjustments).
   */
  unitCost: number | null | "current";
  referenceType?: "order" | "purchase" | "manual" | null;
  referenceId?: number | null;
  note?: string | null;
  createdBy: number;
}

/**
 * The only way stock changes. Inserts the ledger row, updates the cached quantity and,
 * for costed purchases/opening stock, the moving-average cost. Callers must run inside
 * a transaction; the item row is locked for the duration.
 */
export async function applyMovement(
  tx: DbOrTx,
  input: MovementInput
): Promise<{ item: InventoryItem; movementId: number }> {
  const delta = round3(input.delta);
  if (!Number.isFinite(delta) || delta === 0) {
    throw new ServiceError("Quantity must not be zero.");
  }

  const item = await lockItem(tx, input.itemId);
  const unitCost = input.unitCost === "current" ? item.avgCost : (input.unitCost ?? null);

  const affectsAverage =
    (input.type === "purchase" || input.type === "opening") && unitCost !== null;
  const avgCost = affectsAverage
    ? nextAvgCost(item.currentQty, item.avgCost, delta, unitCost as number)
    : item.avgCost;

  const [movement] = await tx
    .insert(stockMovements)
    .values({
      inventoryItemId: item.id,
      type: input.type,
      quantityDelta: delta,
      unitCost,
      referenceType: input.referenceType ?? null,
      referenceId: input.referenceId ?? null,
      note: input.note ?? null,
      createdBy: input.createdBy,
    })
    .returning({ id: stockMovements.id });

  const [updated] = await tx
    .update(inventoryItems)
    .set({
      currentQty: round3(item.currentQty + delta),
      avgCost,
      updatedAt: new Date(),
    })
    .where(eq(inventoryItems.id, item.id))
    .returning();

  return { item: updated, movementId: movement.id };
}

/**
 * Rebuilds current_qty and avg_cost from the ledger. Voided purchases and their void
 * rows are skipped as a pair (they net to zero and must not influence the average).
 */
export async function recomputeItem(tx: DbOrTx, itemId: number): Promise<InventoryItem> {
  await lockItem(tx, itemId);

  const [movements, voidedRows] = await Promise.all([
    tx
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.inventoryItemId, itemId))
      .orderBy(asc(stockMovements.createdAt), asc(stockMovements.id)),
    tx
      .select({ id: inventoryPurchases.id })
      .from(inventoryPurchases)
      .where(
        and(
          eq(inventoryPurchases.inventoryItemId, itemId),
          isNotNull(inventoryPurchases.voidedAt)
        )
      ),
  ]);
  const voided = new Set(voidedRows.map((r) => r.id));

  let qty = 0;
  let avg: number | null = null;
  for (const m of movements) {
    if (m.type === "purchase_void") continue;
    if (m.type === "purchase" && m.referenceId !== null && voided.has(m.referenceId)) continue;

    if ((m.type === "purchase" || m.type === "opening") && m.unitCost !== null) {
      avg = nextAvgCost(qty, avg, m.quantityDelta, m.unitCost);
    }
    qty = round3(qty + m.quantityDelta);
  }

  const [updated] = await tx
    .update(inventoryItems)
    .set({ currentQty: qty, avgCost: avg, updatedAt: new Date() })
    .where(eq(inventoryItems.id, itemId))
    .returning();
  return updated;
}

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

export interface ItemInput {
  name: string;
  baseUnit: BaseUnit;
  displayUnit: DisplayUnit;
  lowStockThreshold?: number | null;
  /** Pack size in base units (packet of 50 pcs → 50) and its name. */
  packSize?: number | null;
  packLabel?: string | null;
  isActive?: boolean;
}

function normaliseItem(input: ItemInput) {
  if (!isUnitCompatible(input.displayUnit, input.baseUnit)) {
    throw new ServiceError("Display unit does not match the base unit.", {
      displayUnit: "Wrong unit",
    });
  }
  const packSize =
    input.packSize === null || input.packSize === undefined || input.packSize <= 0
      ? null
      : round3(input.packSize);
  return {
    name: input.name.trim(),
    baseUnit: input.baseUnit,
    displayUnit: input.displayUnit,
    lowStockThreshold:
      input.lowStockThreshold === null || input.lowStockThreshold === undefined
        ? null
        : round3(input.lowStockThreshold),
    packSize,
    packLabel: packSize === null ? null : input.packLabel?.trim() || null,
  };
}

export async function createItem(input: ItemInput): Promise<InventoryItem> {
  const [item] = await getDb().insert(inventoryItems).values(normaliseItem(input)).returning();
  return item;
}

export async function updateItem(id: number, input: ItemInput): Promise<InventoryItem> {
  return getDb().transaction(async (tx) => {
    const item = await lockItem(tx, id);

    if (input.baseUnit !== item.baseUnit) {
      const [{ n }] = await tx
        .select({ n: count() })
        .from(stockMovements)
        .where(eq(stockMovements.inventoryItemId, id));
      if (n > 0) {
        throw new ServiceError("The unit cannot change once the item has stock movements.", {
          baseUnit: "Locked",
        });
      }
    }

    const [updated] = await tx
      .update(inventoryItems)
      .set({
        ...normaliseItem(input),
        isActive: input.isActive ?? item.isActive,
        updatedAt: new Date(),
      })
      .where(eq(inventoryItems.id, id))
      .returning();
    return updated;
  });
}

// ---------------------------------------------------------------------------
// Purchases
// ---------------------------------------------------------------------------

export interface PurchaseInput {
  itemId: number;
  enteredQty: number;
  enteredUnit: EntryUnit;
  /** "unit" = price per entered unit (Rs 600 / kg, Rs 1,500 / packet), "total" = whole bill. */
  priceMode: "unit" | "total";
  price: number;
  supplier?: string | null;
  note?: string | null;
  /** yyyy-mm-dd in shop time. */
  purchaseDate: string;
}

function purchaseTimestamp(purchaseDate: string): Date {
  const today = toIsoDate();
  if (purchaseDate > today) {
    throw new ServiceError("Purchase date cannot be in the future.", {
      purchaseDate: "In the future",
    });
  }
  if (purchaseDate === today) return new Date();
  // Midday in shop time keeps the calendar date stable regardless of server timezone.
  const offset = config.timeZone === "Asia/Karachi" ? "+05:00" : "Z";
  return new Date(`${purchaseDate}T12:00:00${offset}`);
}

export async function recordPurchase(
  input: PurchaseInput,
  actorId: number
): Promise<{ purchaseId: number; item: InventoryItem }> {
  return getDb().transaction(async (tx) => {
    const item = await lockItem(tx, input.itemId);
    const qtyBase = toBase(item, input.enteredQty, input.enteredUnit, "enteredUnit");
    const totalCost = roundMoney(
      input.priceMode === "unit" ? input.enteredQty * input.price : input.price
    );
    const unitCost = round6(totalCost / qtyBase);
    const purchasedAt = purchaseTimestamp(input.purchaseDate);
    const supplier = input.supplier?.trim() || null;

    const [purchase] = await tx
      .insert(inventoryPurchases)
      .values({
        inventoryItemId: item.id,
        enteredQty: round3(input.enteredQty),
        enteredUnit: input.enteredUnit,
        packSize: input.enteredUnit === "pack" ? item.packSize : null,
        quantityBase: qtyBase,
        unitCost,
        totalCost,
        supplier,
        note: input.note?.trim() || null,
        purchaseDate: input.purchaseDate,
        purchasedAt,
        createdBy: actorId,
      })
      .returning({ id: inventoryPurchases.id });

    const { item: updated } = await applyMovement(tx, {
      itemId: item.id,
      type: "purchase",
      delta: qtyBase,
      unitCost,
      referenceType: "purchase",
      referenceId: purchase.id,
      note: supplier ? `Purchase — ${supplier}` : "Purchase",
      createdBy: actorId,
    });

    return { purchaseId: purchase.id, item: updated };
  });
}

export async function voidPurchase(
  purchaseId: number,
  reason: string,
  actorId: number
): Promise<InventoryItem> {
  return getDb().transaction(async (tx) => {
    const [purchase] = await tx
      .select()
      .from(inventoryPurchases)
      .where(eq(inventoryPurchases.id, purchaseId))
      .for("update");
    if (!purchase) throw new ServiceError("Purchase not found.");
    if (purchase.voidedAt) throw new ServiceError("This purchase is already voided.");

    await tx
      .update(inventoryPurchases)
      .set({ voidedAt: new Date(), voidedBy: actorId, voidReason: reason.trim() })
      .where(eq(inventoryPurchases.id, purchaseId));

    await applyMovement(tx, {
      itemId: purchase.inventoryItemId,
      type: "purchase_void",
      delta: -purchase.quantityBase,
      unitCost: purchase.unitCost,
      referenceType: "purchase",
      referenceId: purchaseId,
      note: `Purchase voided — ${reason.trim()}`,
      createdBy: actorId,
    });

    return recomputeItem(tx, purchase.inventoryItemId);
  });
}

// ---------------------------------------------------------------------------
// Counts and wastage
// ---------------------------------------------------------------------------

export interface StockCountInput {
  countedQty: number;
  unit: EntryUnit;
  reason: string;
}

export async function setStockCount(
  itemId: number,
  input: StockCountInput,
  actorId: number
): Promise<{ item: InventoryItem; delta: number }> {
  return getDb().transaction(async (tx) => {
    const item = await lockItem(tx, itemId);
    const countedBase = toBase(item, input.countedQty, input.unit, "unit");
    const delta = round3(countedBase - item.currentQty);
    if (delta === 0) {
      throw new ServiceError("The counted quantity equals the current stock — nothing to adjust.", {
        countedQty: "Same as current stock",
      });
    }
    const { item: updated } = await applyMovement(tx, {
      itemId,
      type: "adjustment",
      delta,
      unitCost: item.avgCost,
      referenceType: "manual",
      note: `Stock count — ${input.reason.trim()}`,
      createdBy: actorId,
    });
    return { item: updated, delta };
  });
}

export interface WastageInput {
  qty: number;
  unit: EntryUnit;
  reason: string;
}

export async function recordWastage(
  itemId: number,
  input: WastageInput,
  actorId: number
): Promise<InventoryItem> {
  return getDb().transaction(async (tx) => {
    const item = await lockItem(tx, itemId);
    const qtyBase = toBase(item, input.qty, input.unit, "unit");
    const { item: updated } = await applyMovement(tx, {
      itemId,
      type: "wastage",
      delta: -qtyBase,
      unitCost: item.avgCost,
      referenceType: "manual",
      note: `Wastage — ${input.reason.trim()}`,
      createdBy: actorId,
    });
    return updated;
  });
}
