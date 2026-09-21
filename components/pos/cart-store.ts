"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { OrderType, PaymentMethod } from "@/db/schema/orders";
import { roundMoney } from "@/utils/helper";

export interface CartChoice {
  variantId: number;
  itemName: string;
  variantName: string;
  quantity: number;
}

export interface CartSlotChoice {
  slotId: number;
  label: string;
  choices: CartChoice[];
}

export interface CartLine {
  key: string;
  menuItemId: number;
  variantId: number;
  kind: "single" | "deal";
  name: string;
  variantName: string;
  unitPrice: number;
  quantity: number;
  note: string | null;
  /** Deals only: what was picked for each slot (per one deal). */
  dealChoices: CartSlotChoice[];
}

export interface CartState {
  /** Sent with the order so a double tap cannot create two orders. */
  clientId: string;
  lines: CartLine[];
  orderType: OrderType;
  discountAmount: number;
  /** null = use the shop default when delivery. */
  deliveryCharge: number | null;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  note: string;
  paymentMethod: PaymentMethod | null;

  addLine: (line: Omit<CartLine, "key">) => void;
  /** Starts a fresh cart with these lines; `details` carries over order type / customer (repeat order). */
  replaceLines: (
    lines: Omit<CartLine, "key">[],
    details?: Partial<Pick<CartState, "orderType" | "customerName" | "customerPhone" | "deliveryAddress">>
  ) => void;
  setQuantity: (key: string, quantity: number) => void;
  /** Takes one unit off the newest line of an item (the grid's "−"); removes the line at 0. With `variantId`, only that size's lines count. */
  decrementItem: (menuItemId: number, variantId?: number) => void;
  setLineNote: (key: string, note: string | null) => void;
  removeLine: (key: string) => void;
  setOrderType: (orderType: OrderType) => void;
  setDiscount: (amount: number) => void;
  setDeliveryCharge: (charge: number | null) => void;
  setCustomer: (patch: Partial<Pick<CartState, "customerName" | "customerPhone" | "deliveryAddress">>) => void;
  setNote: (note: string) => void;
  setPaymentMethod: (method: PaymentMethod | null) => void;
  clear: () => void;
}

/** A cart left untouched this long is thrown away on the next visit. */
const CART_TTL_MS = 3 * 60 * 60 * 1000;

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const emptyOrder = () => ({
  clientId: newId(),
  lines: [] as CartLine[],
  orderType: "takeaway" as OrderType,
  discountAmount: 0,
  deliveryCharge: null as number | null,
  customerName: "",
  customerPhone: "",
  deliveryAddress: "",
  note: "",
  paymentMethod: "cash" as PaymentMethod | null,
});

/** Same item + size + note + identical deal choices merge into one line. */
function sameLine(a: Omit<CartLine, "key">, b: CartLine): boolean {
  return (
    a.variantId === b.variantId &&
    (a.note ?? "") === (b.note ?? "") &&
    JSON.stringify(a.dealChoices) === JSON.stringify(b.dealChoices)
  );
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      ...emptyOrder(),

      addLine: (line) =>
        set((state) => {
          const existing = state.lines.find((l) => sameLine(line, l));
          if (existing) {
            return {
              lines: state.lines.map((l) =>
                l.key === existing.key ? { ...l, quantity: l.quantity + line.quantity } : l
              ),
            };
          }
          return { lines: [...state.lines, { ...line, key: newId() }] };
        }),

      replaceLines: (lines, details) =>
        set({
          ...emptyOrder(),
          ...details,
          // Same rule as setOrderType: delivery is paid on delivery, counter orders now.
          ...(details?.orderType === "delivery" ? { paymentMethod: null } : {}),
          lines: lines.map((l) => ({ ...l, key: newId() })),
        }),

      setQuantity: (key, quantity) =>
        set((state) => ({
          lines:
            quantity <= 0
              ? state.lines.filter((l) => l.key !== key)
              : state.lines.map((l) => (l.key === key ? { ...l, quantity } : l)),
        })),

      decrementItem: (menuItemId, variantId) =>
        set((state) => {
          const target = state.lines.findLast((l) => l.menuItemId === menuItemId && (variantId === undefined || l.variantId === variantId));
          if (!target) return state;
          return {
            lines:
              target.quantity <= 1
                ? state.lines.filter((l) => l.key !== target.key)
                : state.lines.map((l) => (l.key === target.key ? { ...l, quantity: l.quantity - 1 } : l)),
          };
        }),

      setLineNote: (key, note) =>
        set((state) => ({
          lines: state.lines.map((l) => (l.key === key ? { ...l, note: note?.trim() || null } : l)),
        })),

      removeLine: (key) => set((state) => ({ lines: state.lines.filter((l) => l.key !== key) })),

      setOrderType: (orderType) =>
        set((state) => ({
          orderType,
          // Counter orders are paid now (cash unless changed); delivery defaults to
          // "pay on delivery" because the rider collects the money.
          paymentMethod: orderType === "delivery" ? null : (state.paymentMethod ?? "cash"),
        })),

      setDiscount: (amount) => set({ discountAmount: Math.max(0, amount) }),
      setDeliveryCharge: (charge) => set({ deliveryCharge: charge }),
      setCustomer: (patch) => set(patch),
      setNote: (note) => set({ note }),
      setPaymentMethod: (method) => set({ paymentMethod: method }),
      clear: () => set(emptyOrder()),
    }),
    {
      name: "firebun-cart",
      // localStorage survives Chrome being swiped away mid-order; a stale cart from a
      // previous shift is dropped instead of surprising the next cashier.
      storage: createJSONStorage(() => localStorage),
      merge: (persisted, current) => {
        const saved = persisted as Partial<CartState & { savedAt?: number }> | undefined;
        if (!saved || typeof saved.savedAt !== "number" || Date.now() - saved.savedAt > CART_TTL_MS) {
          return { ...current, ...emptyOrder() };
        }
        return { ...current, ...saved };
      },
      partialize: (state) => ({
        savedAt: Date.now(),
        clientId: state.clientId,
        lines: state.lines,
        orderType: state.orderType,
        discountAmount: state.discountAmount,
        deliveryCharge: state.deliveryCharge,
        customerName: state.customerName,
        customerPhone: state.customerPhone,
        deliveryAddress: state.deliveryAddress,
        note: state.note,
        paymentMethod: state.paymentMethod,
      }),
    }
  )
);

/** Derived totals; the server recomputes all of this from the database. */
export function cartTotals(state: Pick<CartState, "lines" | "discountAmount" | "deliveryCharge" | "orderType">, defaultDeliveryCharge: number) {
  const subtotal = roundMoney(state.lines.reduce((n, l) => n + l.unitPrice * l.quantity, 0));
  const discount = Math.min(roundMoney(state.discountAmount), subtotal);
  const delivery = state.orderType === "delivery" ? roundMoney(state.deliveryCharge ?? defaultDeliveryCharge) : 0;
  const total = roundMoney(subtotal - discount + delivery);
  const count = state.lines.reduce((n, l) => n + l.quantity, 0);
  return { subtotal, discount, delivery, total, count };
}

/** Quantity of each menu item in the cart (all sizes / choices combined), for the item grid. */
export function quantitiesByItem(lines: CartLine[]): Map<number, number> {
  const map = new Map<number, number>();
  for (const l of lines) map.set(l.menuItemId, (map.get(l.menuItemId) ?? 0) + l.quantity);
  return map;
}

/** Quantity of each size (variant) in the cart, for the size chips on sized cards. */
export function quantitiesByVariant(lines: CartLine[]): Map<number, number> {
  const map = new Map<number, number>();
  for (const l of lines) map.set(l.variantId, (map.get(l.variantId) ?? 0) + l.quantity);
  return map;
}

/** false during server render and the first client paint, true once the page has hydrated. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}
