"use client";

import { useMemo, useState, useTransition } from "react";
import { Search, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import {
  addDealSlotAction,
  deleteDealSlotAction,
  updateDealSlotAction,
} from "@/app/(app)/(admin)/menu/actions";
import BottomSheet from "@/components/common/BottomSheet";
import Button from "@/components/common/Button";
import Chips from "@/components/common/Chips";
import ConfirmSheet from "@/components/common/ConfirmSheet";
import Input from "@/components/common/Input";
import NumberStepper from "@/components/common/NumberStepper";
import type { DealSlotFull, VariantChoice } from "@/server/menu/queries";
import { callAction } from "@/utils/call-action";
import { cn } from "@/utils/cn";
import { formatMoney } from "@/utils/helper";
import { validateAndSetErrors } from "@/utils/validation";
import { dealSlotSchema } from "../../schema";

interface SlotSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dealVariantId?: number;
  slot?: DealSlotFull;
  choices: VariantChoice[];
}

const ANY = "any";

/** Parents remount this with a new `key` on each open so the form starts fresh. */
export default function SlotSheet({ open, onOpenChange, dealVariantId, slot, choices }: SlotSheetProps) {
  const [label, setLabel] = useState(slot?.label ?? "");
  const [quantity, setQuantity] = useState(slot?.quantity ?? 1);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(
    () => new Set(slot?.options.map((o) => o.variant.id) ?? [])
  );
  const [query, setQuery] = useState("");
  const [sizeFilter, setSizeFilter] = useState<string>(ANY);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  const sizeNames = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of choices) counts.set(c.variantName, (counts.get(c.variantName) ?? 0) + 1);
    return [...counts.entries()]
      .filter(([name]) => name !== "Regular")
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name]) => name);
  }, [choices]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return choices.filter(
      (c) =>
        (sizeFilter === ANY || c.variantName === sizeFilter) &&
        (q === "" ||
          c.itemName.toLowerCase().includes(q) ||
          c.categoryName.toLowerCase().includes(q))
    );
  }, [choices, query, sizeFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, VariantChoice[]>();
    for (const c of filtered) {
      const list = map.get(c.categoryName) ?? [];
      list.push(c);
      map.set(c.categoryName, list);
    }
    return [...map.entries()];
  }, [filtered]);

  const toggle = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    if (errors.optionVariantIds) setErrors((prev) => ({ ...prev, optionVariantIds: "" }));
  };

  const selectAllShown = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const c of filtered) next.add(c.variantId);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!dealVariantId) return;
    const values = { label, quantity, optionVariantIds: [...selectedIds] };
    if (!(await validateAndSetErrors(dealSlotSchema, values, setErrors))) return;
    startTransition(async () => {
      const result = slot
        ? await callAction(updateDealSlotAction(slot.id, values))
        : await callAction(addDealSlotAction(dealVariantId, values));
      if (!result.ok) {
        if (result.fieldErrors) setErrors(result.fieldErrors);
        toast.error(result.error);
        return;
      }
      toast.success(slot ? "Slot saved" : "Slot added");
      onOpenChange(false);
    });
  };

  const handleDelete = () => {
    if (!slot) return;
    startTransition(async () => {
      const result = await callAction(deleteDealSlotAction(slot.id));
      if (!result.ok) {
        toast.error(result.error);
        setConfirmDelete(false);
        return;
      }
      toast.success("Slot removed");
      onOpenChange(false);
    });
  };

  if (confirmDelete && slot) {
    return (
      <ConfirmSheet
        open
        onOpenChange={(next) => !next && setConfirmDelete(false)}
        title={`Remove “${slot.label}” from this deal?`}
        confirmLabel="Remove"
        destructive
        isLoading={isPending}
        onConfirm={handleDelete}
      />
    );
  }

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={slot ? `Edit slot — ${slot.label}` : "New slot"}
      description="What the customer gets, and what they may choose from."
      footer={
        <div className="flex gap-2">
          {slot && (
            <Button
              variant="outline"
              size="lg"
              aria-label="Remove slot"
              className="px-4 text-danger"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          )}
          <Button size="lg" className="flex-1" isLoading={isPending} onClick={handleSubmit}>
            {slot ? "Save slot" : "Add slot"} · {selectedIds.size} option{selectedIds.size === 1 ? "" : "s"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-[1fr_auto] items-end gap-3">
          <Input
            label="Slot name (printed on the bill)"
            placeholder="e.g. Medium Pizza"
            autoComplete="off"
            value={label}
            onChange={(e) => {
              setLabel(e.target.value);
              if (errors.label) setErrors((prev) => ({ ...prev, label: "" }));
            }}
            error={errors.label}
          />
          <div>
            <span className="mb-1.5 block text-sm font-medium">Qty</span>
            <NumberStepper value={quantity} min={1} max={20} onChange={setQuantity} />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Customer can choose from</span>
            <button
              type="button"
              className="text-xs font-medium text-brand-strong"
              onClick={selectAllShown}
            >
              Select all shown ({filtered.length})
            </button>
          </div>
          {errors.optionVariantIds && (
            <p className="text-xs text-danger">{errors.optionVariantIds}</p>
          )}
          <Input
            type="search"
            placeholder="Search items"
            startIcon={<Search className="h-5 w-5" />}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {sizeNames.length > 0 && (
            <Chips
              aria-label="Size"
              value={sizeFilter}
              onChange={setSizeFilter}
              options={[{ value: ANY, label: "Any size" }, ...sizeNames.map((s) => ({ value: s, label: s }))]}
            />
          )}

          <div className="space-y-3">
            {grouped.map(([categoryName, list]) => (
              <div key={categoryName}>
                <p className="mb-1 px-1 text-xs font-semibold uppercase tracking-wide text-muted">
                  {categoryName}
                </p>
                <ul className="divide-y divide-border rounded-field border border-border">
                  {list.map((c) => {
                    const checked = selectedIds.has(c.variantId);
                    return (
                      <li key={c.variantId}>
                        <label
                          className={cn(
                            "flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm transition-colors active:bg-surface-2",
                            checked && "bg-brand/10"
                          )}
                        >
                          <input
                            type="checkbox"
                            className="h-5 w-5 accent-brand-strong"
                            checked={checked}
                            onChange={() => toggle(c.variantId)}
                          />
                          <span className="min-w-0 flex-1 truncate">
                            {c.itemName}
                            {c.variantName !== "Regular" && (
                              <span className="text-muted"> · {c.variantName}</span>
                            )}
                          </span>
                          <span className="text-xs text-muted tabular-nums">
                            {formatMoney(c.price)}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
            {grouped.length === 0 && (
              <p className="py-6 text-center text-sm text-muted">Nothing matches.</p>
            )}
          </div>
        </div>
      </div>
    </BottomSheet>
  );
}
