import type { Metadata } from "next";
import OrdersScreen from "@/components/orders";
import { ORDER_STATUSES, type OrderStatus } from "@/db/schema";
import { getCurrentUser } from "@/server/auth/dal";
import { getOrderSummaryForDay, listOrders } from "@/server/orders/queries";
import { getTodayBusinessDate } from "@/server/settings/queries";

export const metadata: Metadata = { title: "Orders" };

interface PageProps {
  searchParams: Promise<{ date?: string; status?: string }>;
}

export default async function OrdersPage({ searchParams }: PageProps) {
  const [{ date, status }, today] = await Promise.all([searchParams, getTodayBusinessDate()]);
  await getCurrentUser();

  const businessDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : today;
  const statusFilter = ORDER_STATUSES.includes(status as OrderStatus) ? (status as OrderStatus) : undefined;

  const [orders, summary] = await Promise.all([
    listOrders({ businessDate, status: statusFilter }),
    getOrderSummaryForDay(businessDate),
  ]);

  return (
    <OrdersScreen
      orders={orders}
      summary={summary}
      businessDate={businessDate}
      todayBusinessDate={today}
      status={statusFilter ?? "all"}
    />
  );
}
