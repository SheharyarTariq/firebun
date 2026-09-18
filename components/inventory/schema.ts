import * as yup from "yup";
import type { BaseUnit, DisplayUnit, EntryUnit } from "@/utils/helper";

const BASE_UNIT_VALUES = ["g", "ml", "pcs"];
const DISPLAY_UNIT_VALUES = ["kg", "g", "L", "ml", "pcs"];
const ENTRY_UNIT_VALUES = [...DISPLAY_UNIT_VALUES, "pack"];

/** Treats "" / null as "not provided" so optional numeric fields validate cleanly. */
const optionalNumber = () =>
  yup
    .number()
    .transform((value, original) =>
      original === "" || original === null || original === undefined ? undefined : value
    )
    .typeError("Enter a number");

const requiredNumber = (label: string) =>
  yup.number().typeError("Enter a number").required(`${label} is required`);

const entryUnitRule = yup
  .string()
  .oneOf(ENTRY_UNIT_VALUES, "Pick a unit")
  .required("Pick a unit");

// ---------------------------------------------------------------------------

export interface InventoryItemFormInput {
  name: string;
  baseUnit: BaseUnit;
  displayUnit: DisplayUnit;
  lowStockThreshold: number | null;
  /** Pack size in base units; null when the item is not bought in packs. */
  packSize: number | null;
  packLabel: string | null;
  isActive?: boolean;
}

export const inventoryItemSchema = yup.object({
  name: yup.string().trim().required("Name is required").max(80, "Keep it under 80 characters"),
  baseUnit: yup.string().oneOf(BASE_UNIT_VALUES, "Pick a unit").required("Unit is required"),
  displayUnit: yup.string().oneOf(DISPLAY_UNIT_VALUES, "Pick a unit").required("Pick a unit"),
  lowStockThreshold: optionalNumber().min(0, "Cannot be negative").nullable().notRequired(),
  packSize: optionalNumber().positive("Must be more than 0").nullable().notRequired(),
  packLabel: yup.string().trim().max(30, "Keep it under 30 characters").nullable().notRequired(),
  isActive: yup.boolean().notRequired(),
});

// ---------------------------------------------------------------------------

export interface PurchaseFormInput {
  itemId: number;
  enteredQty: number;
  enteredUnit: EntryUnit;
  priceMode: "unit" | "total";
  price: number;
  supplier?: string;
  note?: string;
  purchaseDate: string;
}

export const purchaseSchema = yup.object({
  itemId: yup.number().required(),
  enteredQty: requiredNumber("Quantity").positive("Must be more than 0"),
  enteredUnit: entryUnitRule,
  priceMode: yup.string().oneOf(["unit", "total"]).required(),
  price: requiredNumber("Price").min(0, "Cannot be negative"),
  supplier: yup.string().trim().max(80, "Keep it under 80 characters").notRequired(),
  note: yup.string().trim().max(200, "Keep it under 200 characters").notRequired(),
  purchaseDate: yup
    .string()
    .required("Date is required")
    .matches(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
});

// ---------------------------------------------------------------------------

export interface StockCountFormInput {
  countedQty: number;
  unit: EntryUnit;
  reason: string;
}

export const stockCountSchema = yup.object({
  countedQty: requiredNumber("Counted quantity").min(0, "Cannot be negative"),
  unit: entryUnitRule,
  reason: yup.string().trim().required("Give a reason (e.g. weekly count)").max(200),
});

// ---------------------------------------------------------------------------

export interface WastageFormInput {
  qty: number;
  unit: EntryUnit;
  reason: string;
}

export const wastageSchema = yup.object({
  qty: requiredNumber("Quantity").positive("Must be more than 0"),
  unit: entryUnitRule,
  reason: yup.string().trim().required("Give a reason (e.g. expired)").max(200),
});

// ---------------------------------------------------------------------------

export interface VoidPurchaseFormInput {
  reason: string;
}

export const voidPurchaseSchema = yup.object({
  reason: yup.string().trim().required("Give a reason").max(200),
});

// ---------------------------------------------------------------------------

export interface LowStockLimitsFormInput {
  /** Threshold in base units per item; null clears the limit. */
  limits: { id: number; lowStockThreshold: number | null }[];
}

export const lowStockLimitsSchema = yup.object({
  limits: yup
    .array()
    .of(
      yup.object({
        id: yup.number().integer().positive().required(),
        lowStockThreshold: optionalNumber().min(0, "Cannot be negative").nullable().notRequired(),
      })
    )
    .min(1, "Nothing to save")
    .max(500)
    .required(),
});
