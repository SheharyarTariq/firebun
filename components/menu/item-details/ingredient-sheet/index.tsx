"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, Search, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { setRecipeLineAction } from "@/app/(app)/(admin)/menu/actions";
import BottomSheet from "@/components/common/BottomSheet";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import type { InventoryChoice, RecipeLine, VariantFull } from "@/server/menu/queries";
import { callAction } from "@/utils/call-action";
import { cn } from "@/utils/cn";
import {
  entryQtyToBase,
  entryUnitOptions,
  formatCostPerUnit,
  formatMoney,
  formatQty,
  fromBaseQty,
  parseNumberInput,
  type EntryUnit,
} from "@/utils/helper";
import { validateAndSetErrors } from "@/utils/validation";
import { recipeLineSchema } from "../../schema";
import RemoveIngredientSheet from "../remove-ingredient-sheet";

interface IngredientSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  variant?: VariantFull;
  /** Other sizes of the same item, offered under "Also add to". */
  siblingVariants: VariantFull[];
  /** Present when editing an existing line. */
  line?: RecipeLine;
  inventory: InventoryChoice[];
}

const POPULAR_LIMIT = 6;

/**
 * Pick an ingredient, type how much of it goes into one serving. After adding, the sheet
 * stays open on the search so a whole recipe can be entered in one go; "Done" closes it.
 * Parents remount this with a new `key` on each open so the form starts fresh.
 */
export default function IngredientSheet({
  open,
  onOpenChange,
  itemName,
  variant,
  siblingVariants,
  line,
  inventory,
}: IngredientSheetProps) {
  // The picker list only holds active items; an archived ingredient still has to open its
  // quantity editor (and be removable), so fall back to the line's own copy of the item.
  const initial: InventoryChoice | null = line
    ? inventory.find((i) => i.id === line.inventoryItemId) ?? { ...line.inventoryItem, currentQty: 0, usedIn: 0 }
    : null;
  const [selected, setSelected] = useState<InventoryChoice | null>(initial);
  const [query, setQuery] = useState("");
  const [qty, setQty] = useState(
    line && initial ? String(fromBaseQty(line.quantity, initial.displayUnit)) : ""
  );
  const [unit, setUnit] = useState<EntryUnit>(initial?.displayUnit ?? "pcs");
  const [alsoIds, setAlsoIds] = useState<Set<number>>(new Set());
  const [added, setAdded] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Lines added in this session count as used too, even before the server refresh lands.
  const usedIds = useMemo(() => new Set(variant?.recipes.map((r) => r.inventoryItemId) ?? []), [variant]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return inventory.filter((i) => q === "" || i.name.toLowerCase().includes(q));
  }, [inventory, query]);
  const popular = useMemo(
    () => (query.trim() === "" ? inventory.filter((i) => i.usedIn > 0 && !usedIds.has(i.id)).sort((a, b) => b.usedIn - a.usedIn).slice(0, POPULAR_LIMIT) : []),
    [inventory, query, usedIds]
  );

  const choose = (item: InventoryChoice) => {
    setSelected(item);
    setUnit(item.displayUnit);
    setQty("");
    setErrors({});
  };

  const qtyNumber = Number(qty) || 0;
  const qtyBase = selected && qtyNumber > 0 ? entryQtyToBase(selected, qtyNumber, unit) : 0;
  const lineCost = selected?.avgCost !== null && selected?.avgCost !== undefined ? qtyBase * selected.avgCost : null;

  const handleSubmit = async () => {
    if (!variant || !selected) return;
    const values = { inventoryItemId: selected.id, qty: parseNumberInput(qty), unit, alsoVariantIds: [...alsoIds] };
    if (!(await validateAndSetErrors(recipeLineSchema, values, setErrors))) return;
    const name = selected.name;
    startTransition(async () => {
      const result = await callAction(setRecipeLineAction(variant.id, values));
      if (!result.ok) {
        if (result.fieldErrors) setErrors(result.fieldErrors);
        toast.error(result.error);
        return;
      }
      if (line) {
        toast.success(`${name} updated`);
        onOpenChange(false);
        return;
      }
      // Back to the search for the next ingredient; the running list shows what went in.
      setAdded((prev) => [...prev, name]);
      setSelected(null);
      setQuery("");
      setQty("");
    });
  };

  const sizeLabel = variant ? (variant.name === "Regular" ? itemName : `${itemName} · ${variant.name}`) : itemName;
  const title = line ? `Edit ${line.inventoryItem.name}` : selected ? `How much ${selected.name}?` : "Add ingredient";

  const footer = selected ? (
    <div className="flex gap-2">
      {line && (
        <Button variant="outline" size="lg" aria-label="Remove ingredient" className="px-4 text-danger" disabled={isPending} onClick={() => setConfirmRemove(true)}>
          <Trash2 className="h-5 w-5" />
        </Button>
      )}
      <Button size="lg" className="flex-1" isLoading={isPending} onClick={handleSubmit}>
        {line ? "Save" : "Add to recipe"}
      </Button>
    </div>
  ) : added.length > 0 ? (
    <Button size="lg" variant="secondary" className="w-full" startIcon={<Check className="h-5 w-5" />} onClick={() => onOpenChange(false)}>
      Done · {added.length} added
    </Button>
  ) : undefined;

  return (
    <>
    {line && (
      <RemoveIngredientSheet
        open={confirmRemove}
        onOpenChange={setConfirmRemove}
        line={line}
        onRemoved={() => onOpenChange(false)}
      />
    )}
    <BottomSheet open={open && !confirmRemove} onOpenChange={onOpenChange} title={title} description={`For one ${sizeLabel}`} footer={footer}>
      {!selected ? (
        <div className="space-y-3">
          {added.length > 0 && (
            <p className="rounded-field bg-success-bg px-4 py-2.5 text-sm text-success">
              Added: {added.join(", ")}
            </p>
          )}
          <Input
            type="search"
            placeholder="Search inventory"
            data-autofocus="true"
            startIcon={<Search className="h-5 w-5" />}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {errors.inventoryItemId && <p className="text-xs text-danger">{errors.inventoryItemId}</p>}

          {popular.length > 0 && (
            <div className="space-y-1">
              <span className="block px-1 text-xs font-semibold uppercase tracking-wide text-muted">Often used</span>
              <div className="flex flex-wrap gap-2">
                {popular.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => choose(item)}
                    className="h-9 rounded-full border border-border bg-surface px-3.5 text-sm font-medium transition-colors active:bg-surface-2"
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <ul className="divide-y divide-border rounded-field border border-border">
            {filtered.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-muted">
                {inventory.length === 0 ? "No inventory items yet." : "Nothing matches."}
              </li>
            )}
            {filtered.map((item) => {
              const used = usedIds.has(item.id) || added.includes(item.name);
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
                        {formatQty(item.currentQty, item.baseUnit)} in stock · {formatCostPerUnit(item.avgCost, item.displayUnit)}
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
            <button type="button" className="-my-2 py-2 text-sm text-muted underline" onClick={() => setSelected(null)}>
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

          {!line && siblingVariants.length > 0 && (
            <div className="space-y-1">
              <span className="block text-sm font-medium">Also add to</span>
              <div className="flex flex-wrap gap-2">
                {siblingVariants.map((v) => {
                  const on = alsoIds.has(v.id);
                  const already = v.recipes.some((r) => r.inventoryItemId === selected.id);
                  return (
                    <button
                      key={v.id}
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      disabled={already}
                      onClick={() =>
                        setAlsoIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(v.id)) next.delete(v.id);
                          else next.add(v.id);
                          return next;
                        })
                      }
                      className={cn(
                        "flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors",
                        on ? "border-ink bg-ink text-ink-foreground" : "border-border bg-surface active:bg-surface-2",
                        already && "opacity-45"
                      )}
                    >
                      {on && <Check className="h-3.5 w-3.5" />}
                      {v.name}
                      {already && <span className="text-xs font-normal">has it</span>}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted">Same quantity for each; change any size’s amount later from its card.</p>
            </div>
          )}
        </div>
      )}
    </BottomSheet>
    </>
  );
}
