import * as yup from "yup";
import type { MenuItemKind } from "@/db/schema/menu";
import type { EntryUnit } from "@/utils/helper";

const requiredNumber = (label: string) =>
  yup.number().typeError("Enter a number").required(`${label} is required`);

// ---------------------------------------------------------------------------

export interface CategoryFormInput {
  name: string;
  isActive?: boolean;
}

export const categorySchema = yup.object({
  name: yup.string().trim().required("Name is required").max(40, "Keep it under 40 characters"),
  isActive: yup.boolean().notRequired(),
});

// ---------------------------------------------------------------------------

export interface VariantFormInput {
  name: string;
  price: number;
  isActive?: boolean;
}

export const variantSchema = yup.object({
  name: yup.string().trim().required("Size name is required").max(30, "Keep it under 30 characters"),
  price: requiredNumber("Price").min(0, "Cannot be negative"),
  isActive: yup.boolean().notRequired(),
});

// ---------------------------------------------------------------------------

export interface CreateMenuItemFormInput {
  categoryId: number;
  name: string;
  kind: MenuItemKind;
  description?: string;
  variants: { name: string; price: number }[];
}

export const createMenuItemSchema = yup.object({
  categoryId: yup.number().typeError("Pick a category").required("Pick a category"),
  name: yup.string().trim().required("Name is required").max(80, "Keep it under 80 characters"),
  kind: yup.string().oneOf(["single", "deal"]).required(),
  description: yup.string().trim().max(300, "Keep it under 300 characters").notRequired(),
  variants: yup
    .array()
    .of(
      yup.object({
        name: yup.string().trim().required("Size name is required").max(30),
        price: requiredNumber("Price").min(0, "Cannot be negative"),
      })
    )
    .min(1, "Add at least one price")
    .required(),
});

export interface UpdateMenuItemFormInput {
  categoryId: number;
  name: string;
  description?: string;
  isActive: boolean;
  isAvailable: boolean;
  showOnPublicMenu: boolean;
}

export const updateMenuItemSchema = yup.object({
  categoryId: yup.number().typeError("Pick a category").required("Pick a category"),
  name: yup.string().trim().required("Name is required").max(80, "Keep it under 80 characters"),
  description: yup.string().trim().max(300, "Keep it under 300 characters").notRequired(),
  isActive: yup.boolean().required(),
  isAvailable: yup.boolean().required(),
  showOnPublicMenu: yup.boolean().required(),
});

// ---------------------------------------------------------------------------

export interface RecipeLineFormInput {
  inventoryItemId: number;
  qty: number;
  unit: EntryUnit;
  /** Other sizes of the same item that get the same line (same quantity; adjust after). */
  alsoVariantIds?: number[];
}

export const recipeLineSchema = yup.object({
  inventoryItemId: yup.number().typeError("Pick an ingredient").required("Pick an ingredient"),
  qty: requiredNumber("Quantity").positive("Must be more than 0"),
  unit: yup.string().oneOf(["kg", "g", "L", "ml", "pcs", "pack"], "Pick a unit").required("Pick a unit"),
  alsoVariantIds: yup.array().of(yup.number().integer().positive().required()).max(20).notRequired(),
});

// ---------------------------------------------------------------------------

export interface DealSlotFormInput {
  label: string;
  quantity: number;
  optionVariantIds: number[];
}

export const dealSlotSchema = yup.object({
  label: yup.string().trim().required("Give the slot a name (e.g. Medium Pizza)").max(60),
  quantity: yup.number().typeError("Enter a number").integer("Whole numbers only").min(1, "At least 1").required(),
  optionVariantIds: yup.array().of(yup.number().required()).min(1, "Pick at least one option").required(),
});
