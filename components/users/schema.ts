import * as yup from "yup";
import { passwordRule } from "@/components/auth/schema";
import type { UserRole } from "@/db/schema/users";

export interface CreateUserFormInput {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export const createUserSchema = yup.object({
  name: yup.string().trim().required("Name is required").max(60, "Keep it under 60 characters"),
  email: yup
    .string()
    .trim()
    .required("Email is required")
    .email("Enter a valid email address"),
  password: passwordRule,
  role: yup.string().oneOf(["admin", "staff"], "Pick a role").required("Role is required"),
});

export interface ResetPasswordFormInput {
  password: string;
}

export const resetPasswordSchema = yup.object({
  password: passwordRule,
});
