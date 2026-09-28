import * as yup from "yup";
import { isPhoneLike } from "@/utils/helper";

export interface CustomerFormInput {
  /** Optional: the phone is the identity, so a customer may be known only by their number. */
  name: string | null;
  phone: string;
  note: string | null;
}

export const customerSchema = yup.object({
  name: yup.string().trim().max(80).nullable(),
  phone: yup
    .string()
    .trim()
    .required("A phone number is how the shop finds them again")
    // Checked on the normalised value, so spacing and +92 never decide the outcome.
    .test("phone", "Check the number", (v) => (v ? isPhoneLike(v) : false)),
  note: yup.string().trim().max(200).nullable(),
});
