import * as yup from "yup";
import type { PaymentMethod } from "@/db/schema/orders";

export interface CancelOrderFormInput {
  reason: string;
  restock: boolean;
}

export const cancelOrderSchema = yup.object({
  reason: yup.string().trim().required("Give a reason").max(200, "Keep it under 200 characters"),
  restock: yup.boolean().required(),
});

export interface MarkPaidFormInput {
  paymentMethod: PaymentMethod;
}

export const markPaidSchema = yup.object({
  paymentMethod: yup.string().oneOf(["cash", "online"], "Pick how it was paid").required("Pick how it was paid"),
});
