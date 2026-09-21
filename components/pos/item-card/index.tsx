"use client";

import { ChevronRight, MoreHorizontal, Plus } from "lucide-react";
import Badge from "@/components/common/Badge";
import NumberStepper from "@/components/common/NumberStepper";
import type { CatalogItem } from "@/server/orders/queries";
import { cn } from "@/utils/cn";
import { formatMoney } from "@/utils/helper";

interface ItemCardProps {
  item: CatalogItem;
  /** Units of this item already in the cart (any size / choices). */
  inCart: number;
  /** Tap on the card: single-price items add one straight away, others open their sheet. */
  onTap: () => void;
  /** The "−" on a single-price item's stepper: takes one unit back out of the cart. */
  onDecrement: () => void;
  /** The corner "…" on single-price items: quantity, note, sold-out toggle. */
  onMore: () => void;
}

/** One menu item in the counter grid. */
export default function ItemCard({ item, inCart, onTap, onDecrement, onMore }: ItemCardProps) {
  const prices = item.variants.map((v) => v.price);
  const min = Math.min(...prices);
  const hasSizes = item.variants.length > 1;
  const quickAdd = item.kind === "single" && !hasSizes;
  const isDeal = item.kind === "deal";
  // Every card is name / price / action row. Single-price items in stock also get "…" top-right
  // and a bottom-right add button that becomes a stepper once the item is in the cart.
  const stacked = quickAdd && item.isAvailable;

  return (
    <div
      className={cn(
        "relative flex min-h-28 rounded-card border shadow-xs transition-[transform,background-color] active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100",
        // Deals echo the black-and-yellow menu board so they stand out in the grid.
        isDeal ? "border-ink bg-ink text-ink-foreground active:bg-ink/90" : "border-border bg-surface active:bg-surface-2",
        inCart > 0 && (isDeal ? "border-brand" : "border-brand-strong/60 bg-brand/10"),
        !item.isAvailable && "opacity-60"
      )}
    >
      <button
        type="button"
        onClick={onTap}
        aria-label={stacked ? `Add ${item.name}` : item.name}
        className="flex min-w-0 flex-1 flex-col justify-between rounded-card p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        <span className={cn("flex items-start justify-between gap-2", stacked ? "pr-8" : "pr-6")}>
          <span className="line-clamp-2 text-sm font-semibold leading-tight">{item.name}</span>
          {isDeal && <Badge variant="brand">Deal</Badge>}
        </span>
        <span className="mt-1 flex flex-1 flex-col justify-between">
          <span className={cn("whitespace-nowrap text-sm font-bold tabular-nums", isDeal && "text-brand")}>
            {hasSizes && <span className="font-normal text-muted">from </span>}
            {formatMoney(min)}
          </span>
          {/* Fixed height with or without the stepper so the grid does not jump on the first tap. */}
          <span className="mt-2 flex h-9 items-center justify-end">
            {!item.isAvailable ? (
              <Badge variant="danger">Sold out</Badge>
            ) : stacked ? (
              inCart === 0 && (
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-brand-ink">
                  <Plus className="h-5 w-5" strokeWidth={2.5} />
                </span>
              )
            ) : (
              <span className={cn("flex items-center text-xs", isDeal ? "text-ink-muted" : "text-muted")}>
                {hasSizes ? `${item.variants.length} sizes` : "Choose"}
                <ChevronRight className="h-4 w-4" />
              </span>
            )}
          </span>
        </span>
      </button>

      {stacked && (
        <button
          type="button"
          onClick={onMore}
          aria-label={`More options for ${item.name}`}
          className="absolute right-0.5 top-0.5 flex h-11 w-11 items-center justify-center rounded-full text-muted transition-colors active:bg-surface-2"
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
      )}

      {stacked && inCart > 0 && (
        <NumberStepper
          size="sm"
          min={0}
          max={99}
          removeAtOne
          value={inCart}
          aria-label={`${item.name} quantity`}
          onChange={(next) => (next > inCart ? onTap() : onDecrement())}
          className="absolute bottom-2.5 right-2.5 shadow-xs"
        />
      )}

      {!stacked && inCart > 0 && (
        <span
          key={inCart}
          aria-label={`${inCart} in cart`}
          className="pointer-events-none absolute -right-1.5 -top-1.5 flex h-6 min-w-6 animate-pop items-center justify-center rounded-full bg-brand px-1.5 text-xs font-bold tabular-nums text-brand-ink shadow-sm ring-2 ring-background"
        >
          {inCart}
        </span>
      )}
    </div>
  );
}
