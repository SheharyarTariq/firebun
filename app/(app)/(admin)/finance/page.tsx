import type { Metadata } from "next";
import { TrendingUp } from "lucide-react";
import EmptyState from "@/components/common/EmptyState";
import PageHeader from "@/components/layout/page-header";
import { routes } from "@/utils/routes";

export const metadata: Metadata = { title: "Finance" };

export default function FinancePage() {
  return (
    <>
      <PageHeader title="Finance" backHref={routes.ui.more} />
      <EmptyState
        icon={TrendingUp}
        title="Finance reports arrive in Phase 5"
        description="Income vs spend for today, this month or any period, plus top sellers."
      />
    </>
  );
}
