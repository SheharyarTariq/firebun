import type { Metadata } from "next";
import { Wallet } from "lucide-react";
import EmptyState from "@/components/common/EmptyState";
import PageHeader from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Expenses" };

export default function ExpensesPage() {
  return (
    <>
      <PageHeader title="Expenses" />
      <EmptyState
        icon={Wallet}
        title="Expenses arrive in Phase 5"
        description="Rent, electricity, salaries and any other spend, with a description."
      />
    </>
  );
}
