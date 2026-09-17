"use client";

import Badge from "@/components/common/Badge";
import type { CatalogItem } from "@/server/orders/queries";
import { cn } from "@/utils/cn";
import { formatMoney } from "@/utils/helper";

interface ItemCardProps {
  item: CatalogItem;
  onSelect: () => void;
}

export default function ItemCard({ item, onSelect }: ItemCardProps) {
  const prices = item.variants.map((v) => v.price);
  const min = Math.min(...prices);
  const hasSizes = item.variants.length > 1;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex min-h-24 flex-col justify-between rounded-card border border-border bg-surface p-3 text-left transition-colors active:bg-surface-2",
        !item.isAvailable && "opacity-60"
      )}
    >
      <span className="flex items-start justify-between gap-2">
        <span className="line-clamp-2 text-sm font-semibold leading-tight">{item.name}</span>
        {item.kind === "deal" && <Badge variant="brand">Deal</Badge>}
      </span>
      <span className="mt-2 flex items-end justify-between gap-2">
        <span className="text-sm font-bold tabular-nums">
          {hasSizes && <span className="font-normal text-muted">from </span>}
          {formatMoney(min)}
        </span>
        {!item.isAvailable ? (
          <Badge variant="danger">Sold out</Badge>
        ) : hasSizes ? (
          <span className="text-xs text-muted">{item.variants.length} sizes</span>
        ) : null}
      </span>
    </button>
  );
}
