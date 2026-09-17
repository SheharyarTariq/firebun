"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, Search, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import {
  removeRecipeLineAction,
  setRecipeLineAction,
} from "@/app/(app)/(admin)/menu/actions";
import BottomSheet from "@/components/common/BottomSheet";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import type { InventoryChoice, RecipeLine, VariantFull } from "@/server/menu/queries";
import { cn } from "@/utils/cn";
import {
  entryQtyToBase,
  entryUnitOptions,
  formatCostPerUnit,
  formatMoney,
  formatQty,
  fromBaseQty,
  type EntryUnit,
} from "@/utils/helper";
import { validateAndSetErrors } from "@/utils/validation";
import { recipeLineSchema } from "../../schema";

interface IngredientSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variant?: VariantFull;
  /** Present when editing an existing line. */
  line?: RecipeLine;
  inventory: InventoryChoice[];
}

/** Parents remount this with a new `key` on each open so the form starts fresh. */
export default function IngredientSheet({
  open,
  onOpenChange,
  variant,
  line,
  inventory,
}: IngredientSheetProps) {
  const initial = line ? inventory.find((i) => i.id === line.inventoryItemId) ?? null : null;
  const [selected, setSelected] = useState<InventoryChoice | null>(initial);
  const [query, setQuery] = useState("");
  const [qty, setQty] = useState(
    line && initial ? String(fromBaseQty(line.quantity, initial.displayUnit)) : ""
  );
  const [unit, setUnit] = useState<EntryUnit>(initial?.displayUnit ?? "pcs");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  const alreadyUsed = new Set(variant?.recipes.map((r) => r.inventoryItemId) ?? []);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return inventory.filter((i) => q === "" || i.name.toLowerCase().includes(q));
  }, [inventory, query]);

  const choose = (item: InventoryChoice) => {
    setSelected(item);
    setUnit(item.displayUnit);
    setErrors({});
  };

  const qtyNumber = Number(qty) || 0;
  const qtyBase = selected && qtyNumber > 0 ? entryQtyToBase(selected, qtyNumber, unit) : 0;
  const lineCost = selected?.avgCost !== null && selected?.avgCost !== undefined ? qtyBase * selected.avgCost : null;

  const handleSubmit = async () => {
    if (!variant) return;
    const values = { inventoryItemId: selected?.id ?? Number.NaN, qty: Number(qty), unit };
    if (!(await validateAndSetErrors(recipeLineSchema, values, setErrors))) return;
    startTransition(async () => {
      const result = await setRecipeLineAction(variant.id, values);
      if (!result.ok) {
        if (result.fieldErrors) setErrors(result.fieldErrors);
        toast.error(result.error);
        return;
      }
      toast.success(line ? "Quantity updated" : `${selected?.name} added to ${variant.name}`);
      onOpenChange(false);
    });
  };

  const handleRemove = () => {
    if (!line) return;
    startTransition(async () => {
      const result = await removeRecipeLineAction(line.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Ingredient removed");
      onOpenChange(false);
    });
  };

  const title = line
    ? `Edit ${line.inventoryItem.name}`
    : selected
      ? `How much ${selected.name}?`
      : "Add ingredient";

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={variant ? `Per one ${variant.name === "Regular" ? "serving" : variant.name}` : undefined}
      footer={
        selected ? (
          <div className="flex gap-2">
            {line && (
              <Button
                variant="outline"
                size="lg"
                aria-label="Remove ingredient"
                className="px-4 text-danger"
                isLoading={isPending}
                onClick={handleRemove}
              >
                <Trash2 className="h-5 w-5" />
              </Button>
            )}
            <Button size="lg" className="flex-1" isLoading={isPending} onClick={handleSubmit}>
              {line ? "Save" : "Add to recipe"}
            </Button>
          </div>
        ) : undefined
      }
    >
      {!selected ? (
        <div className="space-y-3">
          <Input
            type="search"
            placeholder="Search inventory"
            autoFocus
            startIcon={<Search className="h-5 w-5" />}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {errors.inventoryItemId && (
            <p className="text-xs text-danger">{errors.inventoryItemId}</p>
          )}
          <ul className="divide-y divide-border rounded-field border border-border">
            {filtered.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-muted">
                {inventory.length === 0 ? "No inventory items yet." : "Nothing matches."}
              </li>
            )}
            {filtered.map((item) => {
              const used = alreadyUsed.has(item.id);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    disabled={used}
                    onClick={() => choose(item)}
                    className={cn(
                      "flex w-full items-center gap-3 px-3 py-3 text-left transition-colors active:bg-surface-2",
                      used && "opacity-50"
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{item.name}</span>
                      <span className="block text-xs text-muted">
                        {formatQty(item.currentQty, item.baseUnit)} in stock ·{" "}
                        {formatCostPerUnit(item.avgCost, item.displayUnit)}
                      </span>
                    </span>
                    {used && <Check className="h-4 w-4 text-success" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <div className="space-y-4">
          {!line && (
            <button
              type="button"
              className="text-sm text-muted underline"
              onClick={() => setSelected(null)}
            >
              Choose a different ingredient
            </button>
          )}
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <Input
              label="Quantity"
              inputMode="decimal"
              placeholder="0"
              autoFocus
              value={qty}
              onChange={(e) => {
                setQty(e.target.value);
                if (errors.qty) setErrors((prev) => ({ ...prev, qty: "" }));
              }}
              error={errors.qty}
            />
            <Select
              label="Unit"
              options={entryUnitOptions(selected)}
              value={unit}
              containerClassName="w-32"
              onChange={(e) => setUnit(e.target.value as EntryUnit)}
              error={errors.unit}
            />
          </div>
          {qtyBase > 0 && (
            <p className="rounded-field bg-surface-2 px-4 py-3 text-sm text-muted">
              = {formatQty(qtyBase, selected.baseUnit)} per serving
              {lineCost !== null && ` · about ${formatMoney(lineCost)}`}
            </p>
          )}
        </div>
      )}
    </BottomSheet>
  );
}
