import type { Metadata } from "next";
import UsersScreen from "@/components/users";
import { requireAdmin } from "@/server/auth/dal";
import { listUsers } from "@/server/users/queries";

export const metadata: Metadata = { title: "Staff accounts" };

export default async function UsersPage() {
  const [me, rows] = await Promise.all([requireAdmin(), listUsers()]);
  return <UsersScreen users={rows} currentUserId={me.id} />;
}
