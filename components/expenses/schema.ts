import * as yup from "yup";

export interface ExpenseFormInput {
  category: string;
  amount: number;
  description: string;
  expenseDate: string;
}

export const expenseSchema = yup.object({
  category: yup.string().trim().required("Pick or type a category").max(40, "Keep it under 40 characters"),
  amount: yup.number().typeError("Enter an amount").positive("Must be more than 0").required("Amount is required"),
  description: yup.string().trim().required("Describe the expense").max(200, "Keep it under 200 characters"),
  expenseDate: yup
    .string()
    .required("Date is required")
    .matches(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
});
