import { requireAdmin } from "@/server/auth/dal";

/**
 * Admin-only route group (/inventory, /menu, /finance, /users, /settings).
 * Every Server Action under these routes must call requireAdmin() itself as well.
 */
export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireAdmin();
  return <>{children}</>;
}
