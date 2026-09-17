"use server";

import { redirect } from "next/navigation";
import { deleteSession } from "@/server/auth/session";
import { routes } from "@/utils/routes";

export async function signOutAction(): Promise<void> {
  await deleteSession();
  redirect(routes.ui.signIn);
}
