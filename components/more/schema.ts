import * as yup from "yup";
import { passwordRule } from "@/components/auth/schema";

export interface ChangePasswordFormInput {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export const changePasswordSchema = yup.object({
  currentPassword: yup.string().required("Enter your current password"),
  newPassword: passwordRule.notOneOf(
    [yup.ref("currentPassword")],
    "New password must be different"
  ),
  confirmPassword: yup
    .string()
    .required("Repeat the new password")
    .oneOf([yup.ref("newPassword")], "Passwords do not match"),
});
