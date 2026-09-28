import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CustomerDetails from "@/components/customers/customer-details";
import { getCurrentUser } from "@/server/auth/dal";
import { getCustomerDetails } from "@/server/customers/queries";

interface PageProps {
  params: Promise<{ "customer-id": string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { "customer-id": id } = await params;
  const details = await getCustomerDetails(Number(id));
  return { title: details?.customer.name ?? "Customer" };
}

export default async function CustomerPage({ params }: PageProps) {
  const [{ "customer-id": id }, user] = await Promise.all([params, getCurrentUser()]);
  const details = await getCustomerDetails(Number(id));
  if (!details) notFound();

  return <CustomerDetails details={details} isAdmin={user.role === "admin"} />;
}
