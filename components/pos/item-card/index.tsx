"use client";

import { ChevronRight, MoreHorizontal, Plus } from "lucide-react";
import Badge from "@/components/common/Badge";
import type { CatalogItem } from "@/server/orders/queries";
import { cn } from "@/utils/cn";
import { formatMoney } from "@/utils/helper";

interface ItemCardProps {
  item: CatalogItem;
  /** Units of this item already in the cart (any size / choices). */
  inCart: number;
  /** Tap on the card: single-price items add one straight away, others open their sheet. */
  onTap: () => void;
  /** The corner "…" on single-price items: quantity, note, sold-out toggle. */
  onMore: () => void;
}

/** One menu item in the counter grid. */
export default function ItemCard({ item, inCart, onTap, onMore }: ItemCardProps) {
  const prices = item.variants.map((v) => v.price);
  const min = Math.min(...prices);
  const hasSizes = item.variants.length > 1;
  const quickAdd = item.kind === "single" && !hasSizes;
  const isDeal = item.kind === "deal";

  return (
    <div
      className={cn(
        "relative flex min-h-24 rounded-card border shadow-xs transition-[transform,background-color] active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100",
        // Deals echo the black-and-yellow menu board so they stand out in the grid.
        isDeal ? "border-ink bg-ink text-ink-foreground active:bg-ink/90" : "border-border bg-surface active:bg-surface-2",
        inCart > 0 && (isDeal ? "border-brand" : "border-brand-strong/60"),
        !item.isAvailable && "opacity-60"
      )}
    >
      <button
        type="button"
        onClick={onTap}
        aria-label={quickAdd && item.isAvailable ? `Add ${item.name}` : item.name}
        className="flex min-w-0 flex-1 flex-col justify-between rounded-card p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        <span className="flex items-start justify-between gap-2 pr-6">
          <span className="line-clamp-2 text-sm font-semibold leading-tight">{item.name}</span>
          {isDeal && <Badge variant="brand">Deal</Badge>}
        </span>
        <span className="mt-2 flex items-end justify-between gap-2">
          <span className={cn("text-sm font-bold tabular-nums", isDeal && "text-brand")}>
            {hasSizes && <span className="font-normal text-muted">from </span>}
            {formatMoney(min)}
          </span>
          {!item.isAvailable ? (
            <Badge variant="danger">Sold out</Badge>
          ) : quickAdd ? (
            <span className="mr-8 flex h-7 w-7 items-center justify-center rounded-full bg-brand text-brand-ink">
              <Plus className="h-4 w-4" strokeWidth={2.5} />
            </span>
          ) : (
            <span className={cn("flex items-center text-xs", isDeal ? "text-ink-muted" : "text-muted")}>
              {hasSizes ? `${item.variants.length} sizes` : "Choose"}
              <ChevronRight className="h-4 w-4" />
            </span>
          )}
        </span>
      </button>

      {quickAdd && item.isAvailable && (
        <button
          type="button"
          onClick={onMore}
          aria-label={`More options for ${item.name}`}
          className="absolute bottom-1.5 right-1.5 flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors active:bg-surface-2"
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
      )}

      {inCart > 0 && (
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
