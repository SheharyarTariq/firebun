"use client";

import { useState, useTransition } from "react";
import { Copy, Pencil, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { copyRecipeAction } from "@/app/(app)/(admin)/menu/actions";
import Badge from "@/components/common/Badge";
import Button from "@/components/common/Button";
import Card from "@/components/common/Card";
import type { RecipeLine, VariantFull } from "@/server/menu/queries";
import { callAction } from "@/utils/call-action";
import { cn } from "@/utils/cn";
import { formatMoney, formatQty } from "@/utils/helper";
import { estimateCost, marginPct } from "../../format";
import RemoveIngredientSheet from "../remove-ingredient-sheet";

interface VariantCardProps {
  variant: VariantFull;
  isDeal: boolean;
  /** The item has only this size, so "Regular" is just "the price". */
  sole?: boolean;
  /** Other sizes of the same item that already have a recipe (for "copy from"). */
  otherVariants: VariantFull[];
  /** Whether any other item on the menu has a recipe worth copying. */
  canCopyFromOtherItem?: boolean;
  onEdit: () => void;
  onAddIngredient: () => void;
  onEditIngredient: (line: RecipeLine) => void;
  onCopyFromOtherItem?: () => void;
}

export default function VariantCard({
  variant,
  isDeal,
  sole = false,
  otherVariants,
  canCopyFromOtherItem = false,
  onEdit,
  onAddIngredient,
  onEditIngredient,
  onCopyFromOtherItem,
}: VariantCardProps) {
  const [copying, setCopying] = useState<number | null>(null);
  // The line stays set while the confirm slides away so its title doesn't flip mid-animation.
  const [removing, setRemoving] = useState<{ line?: RecipeLine; open: boolean }>({ open: false });
  const [, startTransition] = useTransition();
  const estimate = estimateCost(variant.recipes);
  const margin = estimate.cost !== null ? marginPct(variant.price, estimate.cost) : null;

  const handleCopy = (from: VariantFull) => {
    setCopying(from.id);
    startTransition(async () => {
      const result = await callAction(copyRecipeAction(from.id, variant.id));
      setCopying(null);
      if (!result.ok) toast.error(result.error);
      else toast.success(`Recipe copied from ${from.name} — adjust the amounts`);
    });
  };

  const heading = isDeal ? "Deal price" : sole && variant.name === "Regular" ? "Price" : variant.name;

  return (
    <Card className={cn("space-y-3", !variant.isActive && "opacity-60")}>
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 font-semibold">
            {heading}
            {!variant.isActive && <Badge>Hidden</Badge>}
          </p>
          <p className="text-sm text-muted">
            {estimate.lines === 0 ? (
              isDeal ? (
                "No extra ingredients (packaging etc.)"
              ) : (
                <span className="text-warning">No recipe — sales won’t deduct stock</span>
              )
            ) : estimate.cost !== null ? (
              <>
                Est. cost {formatMoney(estimate.cost)}
                {!estimate.complete && " (partial)"}
                {margin !== null && estimate.complete && !isDeal && (
                  <span className={cn(margin < 30 ? "text-warning" : "text-success")}>
                    {" "}
                    · {margin}% margin
                  </span>
                )}
              </>
            ) : null}
          </p>
        </div>
        <p className="text-lg font-bold tabular-nums">{formatMoney(variant.price)}</p>
        <Button size="icon" variant="ghost" aria-label="Edit size" className="-mr-2" onClick={onEdit}>
          <Pencil className="h-4 w-4" />
        </Button>
      </div>

      {variant.recipes.length > 0 && (
        <ul className="divide-y divide-border rounded-field border border-border">
          {variant.recipes.map((line) => (
            <li key={line.id} className="flex items-center">
              <button
                type="button"
                onClick={() => onEditIngredient(line)}
                className="flex min-h-11 min-w-0 flex-1 items-center gap-3 py-2 pl-3 text-left text-sm transition-colors active:bg-surface-2"
              >
                <span className="min-w-0 flex-1 truncate">
                  {line.inventoryItem.name}
                  {!line.inventoryItem.isActive && (
                    <Badge variant="danger" className="ml-2">
                      Archived item
                    </Badge>
                  )}
                </span>
                <span className="tabular-nums text-muted">
                  {formatQty(line.quantity, line.inventoryItem.baseUnit)}
                </span>
                <Pencil aria-hidden className="h-4 w-4 shrink-0 text-muted" />
              </button>
              <Button
                size="icon"
                variant="ghost"
                className="shrink-0 text-danger"
                aria-label={`Remove ${line.inventoryItem.name} from recipe`}
                onClick={() => setRemoving({ line, open: true })}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant={variant.recipes.length === 0 && !isDeal ? "primary" : "outline"} startIcon={<Plus className="h-4 w-4" />} onClick={onAddIngredient}>
          {isDeal ? "Add extra ingredient" : variant.recipes.length === 0 ? "Add recipe" : "Add ingredient"}
        </Button>
        {variant.recipes.length === 0 &&
          otherVariants.map((v) => (
            <Button
              key={v.id}
              size="sm"
              variant="outline"
              startIcon={<Copy className="h-4 w-4" />}
              isLoading={copying === v.id}
              disabled={copying !== null}
              onClick={() => handleCopy(v)}
            >
              Copy from {v.name}
            </Button>
          ))}
        {variant.recipes.length === 0 && !isDeal && canCopyFromOtherItem && onCopyFromOtherItem && (
          <Button size="sm" variant="ghost" className="text-muted" startIcon={<Copy className="h-4 w-4" />} onClick={onCopyFromOtherItem}>
            Copy from another item…
          </Button>
        )}
      </div>

      <RemoveIngredientSheet
        open={removing.open}
        onOpenChange={(open) => setRemoving((r) => ({ ...r, open }))}
        line={removing.line}
      />
    </Card>
  );
}
