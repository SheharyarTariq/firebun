"use client";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { setLowStockLimitsAction } from "@/app/(app)/(admin)/inventory/actions";
import BottomSheet from "@/components/common/BottomSheet";
import Button from "@/components/common/Button";
import type { InventoryListItem } from "@/server/inventory/queries";
import { callAction } from "@/utils/call-action";
import { formatQty, fromBaseQty, toBaseQty, unitFactor } from "@/utils/helper";

interface LimitsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: InventoryListItem[];
}

/**
 * One row per active item: type the level (in the item's display unit) at which it should
 * show as "Needed". Empty means no alert. Only changed rows are sent.
 */
export default function LimitsSheet({ open, onOpenChange, items }: LimitsSheetProps) {
  const [values, setValues] = useState<Record<number, string>>(() =>
    Object.fromEntries(
      items.map((i) => [i.id, i.lowStockThreshold === null ? "" : String(fromBaseQty(i.lowStockThreshold, i.displayUnit))])
    )
  );
  const [isPending, startTransition] = useTransition();

  const changed = items.filter((i) => {
    const raw = values[i.id]?.trim() ?? "";
    const current = i.lowStockThreshold === null ? "" : String(fromBaseQty(i.lowStockThreshold, i.displayUnit));
    return raw !== current;
  });

  const handleSave = () => {
    const limits = changed.map((i) => {
      const raw = values[i.id]?.trim() ?? "";
      const n = Number(raw);
      return { id: i.id, lowStockThreshold: raw === "" || !Number.isFinite(n) ? null : toBaseQty(n, i.displayUnit, i.baseUnit) };
    });
    startTransition(async () => {
      const result = await callAction(setLowStockLimitsAction({ limits }));
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Limits saved for ${limits.length} item${limits.length === 1 ? "" : "s"}`);
      onOpenChange(false);
    });
  };

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      guardUnsaved
      title="Low-stock limits"
      description="An item shows as “Needed” when stock is at or below its limit. Leave empty for no alert."
      footer={
        <Button size="lg" className="w-full" isLoading={isPending} disabled={changed.length === 0} onClick={handleSave}>
          {changed.length === 0 ? "Save" : `Save ${changed.length} change${changed.length === 1 ? "" : "s"}`}
        </Button>
      }
    >
      <ul className="divide-y divide-border rounded-field border border-border">
        {items.map((item, index) => (
          <li key={item.id} className="flex items-center gap-3 px-3 py-2">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{item.name}</span>
              <span className="block text-xs text-muted">
                {formatQty(item.currentQty, item.baseUnit)} in stock
                {unitFactor(item.displayUnit) !== 1 && ` · limit in ${item.displayUnit}`}
              </span>
            </span>
            <label className="flex items-center gap-1.5 text-sm text-muted">
              <input
                type="text"
                inputMode="decimal"
                placeholder="—"
                aria-label={`Low-stock limit for ${item.name}`}
                data-autofocus={index === 0 ? "true" : undefined}
                value={values[item.id] ?? ""}
                onChange={(e) => setValues((prev) => ({ ...prev, [item.id]: e.target.value }))}
                className="h-11 w-20 rounded-field border border-border bg-surface px-2 text-right text-base text-foreground tabular-nums placeholder:text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
              />
              <span className="w-8">{item.displayUnit}</span>
            </label>
          </li>
        ))}
      </ul>
    </BottomSheet>
  );
}
