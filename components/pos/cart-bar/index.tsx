"use client";

import { ChevronUp, ShoppingBag } from "lucide-react";
import { formatMoney } from "@/utils/helper";
import { cartTotals, useCart, useHydrated } from "../cart-store";

interface CartBarProps {
  defaultDeliveryCharge: number;
  onOpen: () => void;
}

/** Sticky summary above the tab bar; hidden while the cart is empty. */
export default function CartBar({ defaultDeliveryCharge, onOpen }: CartBarProps) {
  const hydrated = useHydrated();
  const lines = useCart((s) => s.lines);
  const discountAmount = useCart((s) => s.discountAmount);
  const deliveryCharge = useCart((s) => s.deliveryCharge);
  const orderType = useCart((s) => s.orderType);

  if (!hydrated || lines.length === 0) return null;
  const totals = cartTotals({ lines, discountAmount, deliveryCharge, orderType }, defaultDeliveryCharge);

  return (
    <div className="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-30 px-4 pb-2">
      <button
        type="button"
        onClick={onOpen}
        className="mx-auto flex h-14 w-full max-w-lg items-center gap-3 rounded-card bg-brand px-4 text-brand-ink shadow-[0_8px_24px_-8px_rgb(255_180_0/0.7)] transition-[background-color,transform] active:scale-[0.99] active:bg-brand-strong motion-reduce:transition-none"
      >
        {/* Re-mounted on every count change so the pop animation replays. */}
        <span
          key={totals.count}
          className="flex h-8 min-w-8 animate-pop items-center justify-center rounded-full bg-brand-ink/15 px-2 text-sm font-bold tabular-nums"
        >
          {totals.count}
        </span>
        <span className="flex flex-1 items-center gap-2 font-semibold">
          <ShoppingBag className="h-5 w-5" />
          View cart
        </span>
        <span className="text-base font-bold tabular-nums">{formatMoney(totals.total)}</span>
        <ChevronUp className="h-5 w-5" />
      </button>
    </div>
  );
}
