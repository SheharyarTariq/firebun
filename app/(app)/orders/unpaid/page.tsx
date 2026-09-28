import type { Metadata } from "next";
import UnpaidOrders from "@/components/orders/unpaid";
import { getCurrentUser } from "@/server/auth/dal";
import { getUnpaidSummary, listUnpaidOrders } from "@/server/orders/queries";
import { getTodayBusinessDate } from "@/server/settings/queries";

export const metadata: Metadata = { title: "Unpaid" };

/**
 * Deliberately has no date filter: the tab badge counts unpaid orders across all time, and
 * the orders screen only ever shows one day, so this is where an old tab is actually found.
 */
export default async function UnpaidOrdersPage() {
  const [rows, summary, today] = await Promise.all([
    listUnpaidOrders(),
    getUnpaidSummary(),
    getTodayBusinessDate(),
    getCurrentUser(),
  ]);

  return <UnpaidOrders rows={rows} total={summary.amount} todayBusinessDate={today} />;
}
