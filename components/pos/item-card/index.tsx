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
  const showStepper = quickAddable && quantity > 0;

  return (
    <div
      className={cn(
        "relative flex rounded-card shadow-1 transition-[transform,background-color] active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100",
        // Deals echo the black-and-yellow menu board so they stand out in the grid.
        isDeal ? "bg-ink text-ink-foreground active:bg-ink/90" : "bg-surface active:bg-surface-2",
        inCart > 0 && (isDeal ? "ring-2 ring-brand" : "bg-brand/10 ring-2 ring-brand-strong/50"),
        !item.isAvailable && "opacity-60"
      )}
    >
      {/*
       * The whole card is the tap target, which is what makes adding fast. It stops short of the
       * stepper row, though: the "−" used to sit 10px from a card edge that silently added an
       * item, so a thumb landing slightly high put a wrong line on the bill with no undo.
       */}
      <button
        type="button"
        onClick={() => onTap(targetId)}
        aria-label={sized ? `Add ${item.name}, ${picked.name}` : quickAddable ? `Add ${item.name}` : item.name}
        className={cn("absolute inset-x-0 top-0 rounded-card", showStepper ? "bottom-14" : "bottom-0")}
      />

      <div className="pointer-events-none relative flex min-w-0 flex-1 flex-col p-2.5 text-left">
        <div className={cn("flex items-start justify-between gap-2", quickAddable && "pr-9")}>
          <span className="line-clamp-2 text-heading">{item.name}</span>
          {isDeal && <Badge variant="brand">Deal</Badge>}
        </div>

        {sized && (
          // One scrolling row. `Chips` fades whichever edge still has more behind it and scrolls
          // the picked size into view, so nothing hides the way it used to. The negative bleed
          // matches this card's `p-2.5` so the row scrolls edge to edge.
          <div className="pointer-events-auto mt-1.5">
            <Chips
              className="-mx-2.5 px-2.5"
              aria-label={`${item.name} size`}
              value={String(picked.id)}
              onChange={(id) => setPickedId(Number(id))}
              options={item.variants.map((v) => ({ value: String(v.id), label: v.name, count: inCartByVariant.get(v.id) || undefined }))}
            />
          </div>
        )}

        {/*
          * The price sits on its own line so it survives the in-cart state. It used to share the
          * bottom row with the action, which meant the stepper *replaced* it once the item was in
          * the cart — a cashier could not see what a line in the order costs.
          *
          * `flex-1 items-start` is what makes equal-height cards work. Cards are stretched to a
          * common height, and this puts the spare height *below* the price: name and price stay
          * together as the item's identity, and the button stays anchored at the bottom. Letting
          * the slack land between the name and the price pulls those two apart, and letting it
          * land mid-card reads as a hole — which is why the grid used to opt out of stretching
          * altogether. Don't put `items-start` back on the grid to "fix" that.
          */}
        <div className="mt-0.5 flex min-w-0 flex-1 items-start">
          <span className={cn("min-w-0 truncate text-body money", isDeal && "text-brand")}>
            {hasSizes && !sized && <span className="font-normal text-muted">from </span>}
            {formatMoney(sized ? picked.price : min)}
          </span>
        </div>

        {/* Fixed height with or without the stepper so the grid does not jump on the first tap. */}
        <div className="mt-2 flex h-11 items-center justify-end gap-2">
          {showStepper ? (
            <NumberStepper
              size="md"
              min={0}
              max={99}
              removeAtOne
              value={quantity}
              aria-label={sized ? `${item.name} ${picked.name} quantity` : `${item.name} quantity`}
              onChange={(next) => (next > quantity ? onTap(targetId) : onDecrement(targetId))}
              className="pointer-events-auto flex w-full justify-between bg-surface shadow-1"
            />
          ) : !item.isAvailable ? (
            <Badge variant="danger">Sold out</Badge>
          ) : (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-brand-ink">
              <Plus className="h-5 w-5" strokeWidth={2.5} />
            </span>
          )}
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
