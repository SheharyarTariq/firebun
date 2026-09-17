import * as yup from "yup";

export const signInSchema = yup.object({
  email: yup
    .string()
    .trim()
    .required("Email is required")
    .email("Enter a valid email address"),
  password: yup.string().required("Password is required"),
});

/** Shared by admin-created accounts and password resets. */
export const passwordRule = yup
  .string()
  .required("Password is required")
  .min(8, "Password must be at least 8 characters");
