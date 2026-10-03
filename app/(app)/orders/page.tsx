import type { Metadata } from "next";
import OrdersScreen from "@/components/orders";
import { ORDER_STATUSES, type OrderStatus } from "@/db/schema";
import { getCurrentUser } from "@/server/auth/dal";
import { getOrderSummary, getUnpaidSummary, listOrders } from "@/server/orders/queries";
import { getTodayBusinessDate } from "@/server/settings/queries";
import { isIsoDate, shiftIsoDate, type DateRange } from "@/utils/helper";

export const metadata: Metadata = { title: "Orders" };

/** Longest span the list loads at once; a longer request keeps its last 92 days. */
const MAX_RANGE_DAYS = 92;

interface PageProps {
  searchParams: Promise<{ date?: string; from?: string; to?: string; status?: string }>;
}

/** `?from=…&to=…` as a real span (two or more days, nothing after today), or null. */
function resolveRange(from: string | undefined, to: string | undefined, today: string): DateRange | null {
  if (!isIsoDate(from) || !isIsoDate(to) || from > to || from > today) return null;
  const end = to > today ? today : to;
  const earliest = shiftIsoDate(end, -(MAX_RANGE_DAYS - 1));
  const start = from < earliest ? earliest : from;
  return start < end ? { from: start, to: end } : null;
}

export default async function OrdersPage({ searchParams }: PageProps) {
  const [{ date, from, to, status }, today] = await Promise.all([searchParams, getTodayBusinessDate(), getCurrentUser()]);

  const range = resolveRange(from, to, today);
  // A range that collapses to one day (or none) falls back to the day view.
  const businessDate = range ? range.to : isIsoDate(date) && date <= today ? date : isIsoDate(from) && from <= today ? from : today;
  const span = range ?? { from: businessDate, to: businessDate };
  const initialStatus = ORDER_STATUSES.includes(status as OrderStatus) ? (status as OrderStatus) : "all";

  // One query for the whole span; the status chips filter on the phone without a round trip.
  const [orders, summary, unpaid] = await Promise.all([
    listOrders(span),
    getOrderSummary(span),
    // All-time, so an older tab is never hidden by the date filter.
    getUnpaidSummary(),
  ]);

  return (
    <OrdersScreen
      orders={orders}
      summary={summary}
      unpaid={unpaid}
      businessDate={businessDate}
      range={range}
      todayBusinessDate={today}
      initialStatus={initialStatus}
    />
  );
}
