import type { BadgeVariant } from "@/components/common/Badge";
import type { OrderStatus, OrderType, PaymentMethod } from "@/db/schema/orders";

export const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  takeaway: "Takeaway",
  dine_in: "Dine-in",
  delivery: "Delivery",
};

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Unpaid",
  completed: "Paid",
  cancelled: "Cancelled",
};

export const STATUS_BADGE: Record<OrderStatus, BadgeVariant> = {
  pending: "warning",
  completed: "success",
  cancelled: "danger",
};

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: "Cash",
  online: "Online",
};

export function lineLabel(name: string, variantName: string): string {
  return variantName === "Regular" ? name : `${name} · ${variantName}`;
}
