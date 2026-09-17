import "server-only";
import { cache } from "react";
import { and, asc, count, desc, eq, isNull, sum } from "drizzle-orm";
import { getDb } from "@/db";
import {
  menuCategories,
  menuItems,
  menuItemVariants,
  orderItems,
  orders,
  type OrderStatus,
} from "@/db/schema";

// ---------------------------------------------------------------------------
// Counter catalogue
// ---------------------------------------------------------------------------

export interface CatalogOption {
  variantId: number;
  itemName: string;
  variantName: string;
  price: number;
  isAvailable: boolean;
}

export interface CatalogSlot {
  id: number;
  label: string;
  quantity: number;
  options: CatalogOption[];
}

export interface CatalogVariant {
  id: number;
  name: string;
  price: number;
  hasRecipe: boolean;
  slots: CatalogSlot[];
}

export interface CatalogItem {
  id: number;
  categoryId: number;
  name: string;
  kind: "single" | "deal";
  description: string | null;
  isAvailable: boolean;
  variants: CatalogVariant[];
}

export interface CatalogCategory {
  id: number;
  name: string;
  items: CatalogItem[];
}

/** Everything the counter needs to build an order, active items only (sold-out included, flagged). */
export async function getPosCatalog(): Promise<CatalogCategory[]> {
  const rows = await getDb().query.menuCategories.findMany({
    where: eq(menuCategories.isActive, true),
    orderBy: [asc(menuCategories.sortOrder), asc(menuCategories.name)],
    with: {
      items: {
        where: eq(menuItems.isActive, true),
        orderBy: [asc(menuItems.sortOrder), asc(menuItems.name)],
        with: {
          variants: {
            where: eq(menuItemVariants.isActive, true),
            orderBy: [asc(menuItemVariants.sortOrder), asc(menuItemVariants.id)],
            with: {
              recipes: { columns: { id: true } },
              dealSlots: {
                orderBy: (slots, { asc: ascFn }) => [ascFn(slots.sortOrder), ascFn(slots.id)],
                with: {
                  options: {
                    with: {
                      variant: {
                        columns: { id: true, name: true, price: true, isActive: true },
                        with: { item: { columns: { name: true, isActive: true, isAvailable: true } } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  return rows
    .map<CatalogCategory>((category) => ({
      id: category.id,
      name: category.name,
      items: category.items
        .filter((item) => item.variants.length > 0)
        .map<CatalogItem>((item) => ({
          id: item.id,
          categoryId: category.id,
          name: item.name,
          kind: item.kind,
          description: item.description,
          isAvailable: item.isAvailable,
          variants: item.variants.map<CatalogVariant>((variant) => ({
            id: variant.id,
            name: variant.name,
            price: variant.price,
            hasRecipe: variant.recipes.length > 0,
            slots: variant.dealSlots.map<CatalogSlot>((slot) => ({
              id: slot.id,
              label: slot.label,
              quantity: slot.quantity,
              options: slot.options
                .filter((o) => o.variant.isActive && o.variant.item.isActive)
                .map<CatalogOption>((o) => ({
                  variantId: o.variant.id,
                  itemName: o.variant.item.name,
                  variantName: o.variant.name,
                  price: o.variant.price,
                  isAvailable: o.variant.item.isAvailable,
                })),
            })),
          })),
        })),
    }))
    .filter((category) => category.items.length > 0);
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export interface ListOrdersFilter {
  businessDate: string;
  status?: OrderStatus;
}

export async function listOrders(filter: ListOrdersFilter) {
  return getDb().query.orders.findMany({
    where: and(
      eq(orders.businessDate, filter.businessDate),
      filter.status ? eq(orders.status, filter.status) : undefined
    ),
    orderBy: [desc(orders.dailySeq)],
    with: {
      createdByUser: { columns: { name: true } },
      // Parent lines only: enough for the "2× Zinger Burger, Deal 1" summary.
      items: {
        where: isNull(orderItems.parentOrderItemId),
        orderBy: [asc(orderItems.id)],
        columns: { id: true, nameSnapshot: true, variantNameSnapshot: true, quantity: true },
      },
    },
  });
}

export type OrderListRow = Awaited<ReturnType<typeof listOrders>>[number];

export const getOrderDetails = cache(async (id: number) => {
  const order = await getDb().query.orders.findFirst({
    where: eq(orders.id, id),
    with: {
      createdByUser: { columns: { name: true } },
      cancelledByUser: { columns: { name: true } },
      items: { orderBy: [asc(orderItems.id)] },
    },
  });
  return order ?? null;
});

export type OrderDetails = NonNullable<Awaited<ReturnType<typeof getOrderDetails>>>;
export type OrderLine = OrderDetails["items"][number];

export async function countPendingOrders(): Promise<number> {
  const [row] = await getDb()
    .select({ n: count() })
    .from(orders)
    .where(eq(orders.status, "pending"));
  return row?.n ?? 0;
}

export interface DaySummary {
  completed: number;
  pending: number;
  cancelled: number;
  /** Σ total of completed orders. */
  revenue: number;
  /** Σ total of pending (unpaid delivery) orders. */
  pendingAmount: number;
}

export async function getOrderSummaryForDay(businessDate: string): Promise<DaySummary> {
  const rows = await getDb()
    .select({ status: orders.status, n: count(), total: sum(orders.total) })
    .from(orders)
    .where(eq(orders.businessDate, businessDate))
    .groupBy(orders.status);
  const summary: DaySummary = { completed: 0, pending: 0, cancelled: 0, revenue: 0, pendingAmount: 0 };
  for (const r of rows) {
    summary[r.status] = r.n;
    if (r.status === "completed") summary.revenue = Number(r.total ?? 0);
    if (r.status === "pending") summary.pendingAmount = Number(r.total ?? 0);
  }
  return summary;
}
