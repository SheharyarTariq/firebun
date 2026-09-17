import * as yup from "yup";

export interface SettingsFormInput {
  shopName: string;
  phone: string | null;
  phone2: string | null;
  address: string | null;
  receiptHeaderLines: string[];
  receiptFooter: string;
  charsPerLine: number;
  defaultDeliveryCharge: number;
  staffMaxDiscountPct: number;
  staffCanAddExpenses: boolean;
  staffCancelWindowMinutes: number;
  businessDayCutoffHour: number;
  autoPrintOnPlace: boolean;
  printKitchenCopy: boolean;
}

const num = (label: string) => yup.number().typeError(`${label} must be a number`);

export const settingsSchema = yup.object({
  shopName: yup.string().trim().required("Shop name is required").max(40, "Keep it under 40 characters"),
  phone: yup.string().trim().max(30).nullable().notRequired(),
  phone2: yup.string().trim().max(30).nullable().notRequired(),
  address: yup.string().trim().max(120, "Keep it under 120 characters").nullable().notRequired(),
  receiptHeaderLines: yup.array().of(yup.string().trim().max(48, "Keep each line under 48 characters").required()).max(4).required(),
  receiptFooter: yup.string().trim().max(120, "Keep it under 120 characters").required(),
  charsPerLine: num("Characters per line").oneOf([32, 42, 48], "Pick 32, 42 or 48").required(),
  defaultDeliveryCharge: num("Delivery charge").min(0, "Cannot be negative").required("Delivery charge is required"),
  staffMaxDiscountPct: num("Staff discount").integer("Whole number").min(0).max(100, "Max 100").required(),
  staffCanAddExpenses: yup.boolean().required(),
  staffCancelWindowMinutes: num("Cancel window").integer("Whole minutes").min(0).max(1440).required(),
  businessDayCutoffHour: num("Cutoff hour").integer("Whole hours").min(0).max(12, "Between 0 and 12").required(),
  autoPrintOnPlace: yup.boolean().required(),
  printKitchenCopy: yup.boolean().required(),
});
