import * as yup from "yup";

const money = (label: string) =>
  yup.number().typeError(`${label} must be a number`).min(0, `${label} cannot be negative`);

export const placeOrderSchema = yup.object({
  clientId: yup.string().uuid("Invalid cart id").required(),
  orderType: yup.string().oneOf(["takeaway", "dine_in", "delivery"]).required("Pick an order type"),
  lines: yup
    .array()
    .of(
      yup.object({
        variantId: yup.number().integer().positive().required(),
        quantity: yup.number().integer("Whole numbers only").min(1, "At least 1").max(99, "Max 99").required(),
        note: yup.string().trim().max(120, "Keep the note under 120 characters").nullable().notRequired(),
        dealChoices: yup
          .array()
          .of(
            yup.object({
              slotId: yup.number().integer().positive().required(),
              choices: yup
                .array()
                .of(
                  yup.object({
                    variantId: yup.number().integer().positive().required(),
                    quantity: yup.number().integer().min(1).required(),
                  })
                )
                .required(),
            })
          )
          .notRequired(),
      })
    )
    .min(1, "The cart is empty")
    .required(),
  discountAmount: money("Discount").required(),
  deliveryCharge: money("Delivery charge").nullable().notRequired(),
  customerName: yup.string().trim().max(60).nullable().notRequired(),
  customerPhone: yup.string().trim().max(20).nullable().notRequired(),
  deliveryAddress: yup.string().trim().max(200).nullable().notRequired(),
  note: yup.string().trim().max(200).nullable().notRequired(),
  paymentMethod: yup.string().oneOf(["cash", "online"]).nullable().notRequired(),
});
