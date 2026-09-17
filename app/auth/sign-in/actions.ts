"use server";

import { redirect } from "next/navigation";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { signInSchema } from "@/components/auth/schema";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { createSession } from "@/server/auth/session";
import { routes } from "@/utils/routes";
import { validateForm } from "@/utils/validation";

export interface SignInState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

// Compared against when the email does not exist, so both branches cost the same.
let dummyHash: string | undefined;

export async function signInAction(
  _previous: SignInState,
  formData: FormData
): Promise<SignInState> {
  const values = {
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    password: String(formData.get("password") ?? ""),
  };
  const next = String(formData.get("next") ?? "");

  const fieldErrors = await validateForm(signInSchema, values);
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const user = await getDb().query.users.findFirst({
    where: sql`lower(${users.email}) = ${values.email}`,
  });

  dummyHash ??= await hashPassword("firebun-dummy-password");
  const passwordOk = await verifyPassword(values.password, user?.passwordHash ?? dummyHash);

  if (!user || !user.isActive || !passwordOk) {
    return { error: "Wrong email or password." };
  }

  await createSession(user);
  redirect(isSafeRedirect(next) ? next : routes.ui.pos);
}

function isSafeRedirect(path: string): boolean {
  return path.startsWith("/") && !path.startsWith("//") && !path.startsWith("/auth");
}
