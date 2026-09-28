import type { Metadata } from "next";
import OrdersScreen from "@/components/orders";
import { ORDER_STATUSES, type OrderStatus } from "@/db/schema";
import { getCurrentUser } from "@/server/auth/dal";
import { getOrderSummaryForDay, getUnpaidSummary, listOrders } from "@/server/orders/queries";
import { getTodayBusinessDate } from "@/server/settings/queries";
import { isIsoDate } from "@/utils/helper";

export const metadata: Metadata = { title: "Orders" };

interface PageProps {
  searchParams: Promise<{ date?: string; status?: string }>;
}

export default async function OrdersPage({ searchParams }: PageProps) {
  const [{ date, status }, today] = await Promise.all([searchParams, getTodayBusinessDate(), getCurrentUser()]);

  const businessDate = isIsoDate(date) && date <= today ? date : today;
  const initialStatus = ORDER_STATUSES.includes(status as OrderStatus) ? (status as OrderStatus) : "all";

  // One query for the whole day; the status chips filter on the phone without a round trip.
  const [orders, summary, unpaid] = await Promise.all([
    listOrders({ businessDate }),
    getOrderSummaryForDay(businessDate),
    // All-time, so an older tab is never hidden by the day filter.
    getUnpaidSummary(),
  ]);

  return (
    <OrdersScreen
      orders={orders}
      summary={summary}
      unpaid={unpaid}
      businessDate={businessDate}
      todayBusinessDate={today}
      initialStatus={initialStatus}
    />
  );
}
