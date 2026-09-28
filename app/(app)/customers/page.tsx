import type { Metadata } from "next";
import CustomersScreen from "@/components/customers";
import { getCurrentUser } from "@/server/auth/dal";
import { listCustomersWithBalance } from "@/server/customers/queries";

export const metadata: Metadata = { title: "Customers" };

export default async function CustomersPage() {
  const [rows, user] = await Promise.all([listCustomersWithBalance(), getCurrentUser()]);
  const totalOwed = rows.reduce((n, r) => n + r.owed, 0);

  return <CustomersScreen rows={rows} totalOwed={totalOwed} isAdmin={user.role === "admin"} />;
}
