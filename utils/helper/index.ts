import { format } from "date-fns";
import { TZDate } from "@date-fns/tz";
import { config } from "@/config";

// ---------------------------------------------------------------------------
// Money (PKR, whole rupees on the menu; costs may carry decimals)
// ---------------------------------------------------------------------------

const moneyFormatter = new Intl.NumberFormat("en-PK", {
  maximumFractionDigits: 0,
});

const moneyFormatterWithDecimals = new Intl.NumberFormat("en-PK", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** "Rs 1,250" — whole rupees, the way prices appear on the menu and the bill. */
export function formatMoney(amount: number | string | null | undefined): string {
  const value = toNumber(amount);
  return `${config.currencySymbol} ${moneyFormatter.format(value)}`;
}

/** "Rs 0.45" — for per-unit costs and averages. */
export function formatMoneyExact(amount: number | string | null | undefined): string {
  const value = toNumber(amount);
  return `${config.currencySymbol} ${moneyFormatterWithDecimals.format(value)}`;
}

export function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Round to 2 decimals without floating-point drift (12.345 → 12.35). */
export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

// ---------------------------------------------------------------------------
// Dates — everything the shop sees is in Asia/Karachi regardless of server TZ
// ---------------------------------------------------------------------------

export function toShopTime(date: Date | string | number = new Date()): TZDate {
  const timestamp = date instanceof Date ? date.getTime() : new Date(date).getTime();
  return new TZDate(timestamp, config.timeZone);
}

/** "16 Sep 2026, 5:30 PM" */
export function formatDateTime(date: Date | string | number): string {
  return format(toShopTime(date), "d MMM yyyy, h:mm a");
}

/** "5:30 PM" */
export function formatTime(date: Date | string | number): string {
  return format(toShopTime(date), "h:mm a");
}

/** "16 Sep 2026" */
export function formatDate(date: Date | string | number): string {
  return format(toShopTime(date), "d MMM yyyy");
}

/** "2026-09-16" in shop time — the format used for `date` columns. */
export function toIsoDate(date: Date | string | number = new Date()): string {
  return format(toShopTime(date), "yyyy-MM-dd");
}

/**
 * The business date an event belongs to. With a cutoff of 4, anything before 4 am
 * counts towards the previous day (late-night orders belong to "yesterday").
 */
export function businessDateFor(
  date: Date | string | number,
  cutoffHour: number
): string {
  const shopTime = toShopTime(date);
  const shifted = new TZDate(
    shopTime.getTime() - cutoffHour * 60 * 60 * 1000,
    config.timeZone
  );
  return format(shifted, "yyyy-MM-dd");
}

// ---------------------------------------------------------------------------
// Units — inventory is stored in base units (g / ml / pcs)
// ---------------------------------------------------------------------------

export type BaseUnit = "g" | "ml" | "pcs";
export type DisplayUnit = "kg" | "g" | "L" | "ml" | "pcs";

export const BASE_UNITS: BaseUnit[] = ["g", "ml", "pcs"];

export const DISPLAY_UNITS_FOR_BASE: Record<BaseUnit, DisplayUnit[]> = {
  g: ["kg", "g"],
  ml: ["L", "ml"],
  pcs: ["pcs"],
};

const UNIT_FACTORS: Record<DisplayUnit, { base: BaseUnit; factor: number }> = {
  kg: { base: "g", factor: 1000 },
  g: { base: "g", factor: 1 },
  L: { base: "ml", factor: 1000 },
  ml: { base: "ml", factor: 1 },
  pcs: { base: "pcs", factor: 1 },
};

/** Convert a quantity typed in a display unit (5 kg) to base units (5000 g). */
export function toBaseQty(qty: number, unit: DisplayUnit, baseUnit: BaseUnit): number {
  const def = UNIT_FACTORS[unit];
  if (def.base !== baseUnit) {
    throw new Error(`Unit ${unit} cannot be converted to ${baseUnit}`);
  }
  return qty * def.factor;
}

/** How many base units one display unit holds (kg → 1000, pcs → 1). */
export function unitFactor(unit: DisplayUnit): number {
  return UNIT_FACTORS[unit].factor;
}

export function isUnitCompatible(unit: DisplayUnit, baseUnit: BaseUnit): boolean {
  return UNIT_FACTORS[unit].base === baseUnit;
}

/** Base-unit quantity expressed in a display unit: 2500 g → 2.5 (kg). */
export function fromBaseQty(qtyBase: number | string, unit: DisplayUnit): number {
  return toNumber(qtyBase) / unitFactor(unit);
}

/** "Rs 600.00 / kg" from a per-base-unit cost (0.6 per g). */
export function formatCostPerUnit(
  costPerBase: number | string | null | undefined,
  unit: DisplayUnit
): string {
  if (costPerBase === null || costPerBase === undefined) return "—";
  return `${formatMoneyExact(toNumber(costPerBase) * unitFactor(unit))} / ${unit}`;
}

// ---------------------------------------------------------------------------
// Packs — an item may be bought/counted in its own pack (packet of 50, 5 kg bag)
// ---------------------------------------------------------------------------

/** A quantity can be typed in a display unit or in the item's pack. */
export type EntryUnit = DisplayUnit | "pack";

export interface PackAware {
  baseUnit: BaseUnit;
  /** Pack size in base units, or null when the item has no pack. */
  packSize: number | null;
  packLabel: string | null;
}

export const DEFAULT_PACK_LABEL = "packet";

export function packLabelOf(item: PackAware): string {
  return item.packLabel?.trim() || DEFAULT_PACK_LABEL;
}

/** Units offered in quantity pickers: the pack first (when defined), then display units. */
export function entryUnitOptions(item: PackAware): { value: EntryUnit; label: string }[] {
  const packOption =
    item.packSize && item.packSize > 0
      ? [{ value: "pack" as const, label: packLabelOf(item) }]
      : [];
  return [
    ...packOption,
    ...DISPLAY_UNITS_FOR_BASE[item.baseUnit].map((u) => ({ value: u as EntryUnit, label: u })),
  ];
}

/** Human label for a unit: "packet" for packs, otherwise the unit itself. */
export function entryUnitLabel(item: PackAware, unit: EntryUnit): string {
  return unit === "pack" ? packLabelOf(item) : unit;
}

/**
 * Convert a typed quantity to base units. Throws for an incompatible unit or for
 * "pack" on an item without a pack size; callers turn that into a field error.
 */
export function entryQtyToBase(item: PackAware, qty: number, unit: EntryUnit): number {
  if (unit === "pack") {
    if (!item.packSize || item.packSize <= 0) {
      throw new Error("This item has no pack size");
    }
    return qty * item.packSize;
  }
  return toBaseQty(qty, unit, item.baseUnit);
}

/** "packet of 50 pcs" / "bag of 5 kg" */
export function describePack(item: PackAware): string | null {
  if (!item.packSize || item.packSize <= 0) return null;
  return `${packLabelOf(item)} of ${formatQty(item.packSize, item.baseUnit)}`;
}

/** "2.5 kg", "350 g", "1.5 L", "12 pcs" — picks the friendliest unit. */
export function formatQty(qtyBase: number | string, baseUnit: BaseUnit): string {
  const qty = toNumber(qtyBase);
  const abs = Math.abs(qty);
  if (baseUnit === "g" && abs >= 1000) return `${trimNumber(qty / 1000)} kg`;
  if (baseUnit === "ml" && abs >= 1000) return `${trimNumber(qty / 1000)} L`;
  return `${trimNumber(qty)} ${baseUnit}`;
}

function trimNumber(value: number): string {
  return Number(value.toFixed(3)).toString();
}

// ---------------------------------------------------------------------------
// Misc
// ---------------------------------------------------------------------------

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** "#042" style daily order number for bills and lists. */
export function formatOrderNumber(dailySeq: number): string {
  return `#${String(dailySeq).padStart(3, "0")}`;
}
