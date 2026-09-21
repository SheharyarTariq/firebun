"use client";

import { useState } from "react";
import { MoreHorizontal, Plus } from "lucide-react";
import Badge from "@/components/common/Badge";
import Chips from "@/components/common/Chips";
import NumberStepper from "@/components/common/NumberStepper";
import type { CatalogItem } from "@/server/orders/queries";
import { cn } from "@/utils/cn";
import { formatMoney } from "@/utils/helper";

interface ItemCardProps {
  item: CatalogItem;
  /** Units of this item already in the cart (any size / choices). */
  inCart: number;
  /** Units per size (variant id) in the cart: the chips and stepper of sized items read it. */
  inCartByVariant: ReadonlyMap<number, number>;
  /** Tap on the card or its "+": single-price and sized items add one straight away (sized: the picked size), others open their sheet. */
  onTap: (variantId?: number) => void;
  /** The "−" on the stepper: takes one unit back out of the cart (sized: of the picked size). */
  onDecrement: (variantId?: number) => void;
  /** The corner "…": quantity, note, sold-out toggle (sized: opens on the picked size). */
  onMore: (variantId?: number) => void;
}

/** One menu item in the counter grid. */
export default function ItemCard({ item, inCart, inCartByVariant, onTap, onDecrement, onMore }: ItemCardProps) {
  const [pickedId, setPickedId] = useState(item.variants[0]?.id);
  const prices = item.variants.map((v) => v.price);
  const min = Math.min(...prices);
  const hasSizes = item.variants.length > 1;
  const isDeal = item.kind === "deal";
  // Every card is name / price / action row, and every in-stock card has the same "+" bottom-right.
  // Single-price and sized items are added straight from the card: "…" top-right, and the "+" becomes
  // a stepper once in the cart. Sized items pick the size on chips first, so price, "+" and stepper
  // follow the picked size. Deals (and sold-out items) open their sheet instead and show a count badge.
  const quickAddable = item.kind === "single" && item.isAvailable;
  const sized = quickAddable && hasSizes;
  const picked = item.variants.find((v) => v.id === pickedId) ?? item.variants[0];
  const targetId = sized ? picked.id : undefined;
  const quantity = sized ? (inCartByVariant.get(picked.id) ?? 0) : inCart;

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
      {/* The whole card is the tap target; chips can't nest in a button, so the content sits above it and lets taps through. */}
      <button
        type="button"
        onClick={() => onTap(targetId)}
        aria-label={sized ? `Add ${item.name}, ${picked.name}` : quickAddable ? `Add ${item.name}` : item.name}
        className="absolute inset-0 rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      />

      <div className="pointer-events-none relative flex min-w-0 flex-1 flex-col justify-between p-3 text-left">
        <div className={cn("flex items-start justify-between gap-2", quickAddable ? "pr-8" : "pr-6")}>
          <span className="line-clamp-2 text-sm font-semibold leading-tight">{item.name}</span>
          {isDeal && <Badge variant="brand">Deal</Badge>}
        </div>
        <div className="mt-1 flex flex-1 flex-col justify-between">
          <span className={cn("whitespace-nowrap text-sm font-bold tabular-nums", isDeal && "text-brand")}>
            {hasSizes && !sized && <span className="font-normal text-muted">from </span>}
            {formatMoney(sized ? picked.price : min)}
          </span>
          {sized && (
            <div className="pointer-events-auto mt-1">
              <Chips
                aria-label={`${item.name} size`}
                className="-mx-3 px-3"
                value={String(picked.id)}
                onChange={(id) => setPickedId(Number(id))}
                options={item.variants.map((v) => ({ value: String(v.id), label: v.name, count: inCartByVariant.get(v.id) || undefined }))}
              />
            </div>
          )}
          {/* Fixed height with or without the stepper so the grid does not jump on the first tap. */}
          <div className="mt-2 flex h-9 items-center justify-end">
            {!item.isAvailable ? (
              <Badge variant="danger">Sold out</Badge>
            ) : (
              <>
                {!quickAddable && (
                  <span className={cn("mr-auto text-xs", isDeal ? "text-ink-muted" : "text-muted")}>
                    {hasSizes ? `${item.variants.length} sizes` : "Choose"}
                  </span>
                )}
                {/* Same "+" on every in-stock card; deals keep it in the cart too (the count badge shows the total). */}
                {(!quickAddable || quantity === 0) && (
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-brand-ink">
                    <Plus className="h-5 w-5" strokeWidth={2.5} />
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {quickAddable && (
        <button
          type="button"
          onClick={() => onMore(targetId)}
          aria-label={`More options for ${item.name}`}
          className="absolute right-0.5 top-0.5 flex h-11 w-11 items-center justify-center rounded-full text-muted transition-colors active:bg-surface-2"
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
      )}

      {quickAddable && quantity > 0 && (
        <NumberStepper
          size="sm"
          min={0}
          max={99}
          removeAtOne
          value={quantity}
          aria-label={sized ? `${item.name} ${picked.name} quantity` : `${item.name} quantity`}
          onChange={(next) => (next > quantity ? onTap(targetId) : onDecrement(targetId))}
          className="absolute bottom-2.5 right-2.5 shadow-xs"
        />
      )}

      {!quickAddable && inCart > 0 && (
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
