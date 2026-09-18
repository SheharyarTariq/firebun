"use client";

import { useState, useTransition } from "react";
import { Copy, Pencil, Plus } from "lucide-react";
import toast from "react-hot-toast";
import { copyRecipeAction } from "@/app/(app)/(admin)/menu/actions";
import Badge from "@/components/common/Badge";
import Button from "@/components/common/Button";
import Card from "@/components/common/Card";
import Select from "@/components/common/Select";
import type { RecipeLine, VariantFull } from "@/server/menu/queries";
import { callAction } from "@/utils/call-action";
import { cn } from "@/utils/cn";
import { formatMoney, formatQty } from "@/utils/helper";
import { estimateCost, marginPct } from "../../format";

interface VariantCardProps {
  variant: VariantFull;
  isDeal: boolean;
  /** Other sizes of the same item that already have a recipe (for "copy from"). */
  otherVariants: VariantFull[];
  onEdit: () => void;
  onAddIngredient: () => void;
  onEditIngredient: (line: RecipeLine) => void;
}

export default function VariantCard({
  variant,
  isDeal,
  otherVariants,
  onEdit,
  onAddIngredient,
  onEditIngredient,
}: VariantCardProps) {
  const [copyFrom, setCopyFrom] = useState("");
  const [isPending, startTransition] = useTransition();
  const estimate = estimateCost(variant.recipes);
  const margin = estimate.cost !== null ? marginPct(variant.price, estimate.cost) : null;

  const handleCopy = () => {
    if (!copyFrom) return;
    startTransition(async () => {
      const result = await callAction(copyRecipeAction(Number(copyFrom), variant.id));
      if (!result.ok) toast.error(result.error);
      else toast.success("Recipe copied — adjust the quantities");
    });
  };

  return (
    <Card className={cn("space-y-3", !variant.isActive && "opacity-60")}>
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 font-semibold">
            {isDeal ? "Deal price" : variant.name}
            {!variant.isActive && <Badge>Inactive</Badge>}
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
        <Button size="sm" variant="ghost" aria-label="Edit size" className="px-2" onClick={onEdit}>
          <Pencil className="h-4 w-4" />
        </Button>
      </div>

      {variant.recipes.length > 0 && (
        <ul className="divide-y divide-border rounded-field border border-border">
          {variant.recipes.map((line) => (
            <li key={line.id}>
              <button
                type="button"
                onClick={() => onEditIngredient(line)}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors active:bg-surface-2"
              >
                <span className="min-w-0 flex-1 truncate">
                  {line.inventoryItem.name}
                  {!line.inventoryItem.isActive && (
                    <Badge variant="danger" className="ml-2">
                      Hidden item
                    </Badge>
                  )}
                </span>
                <span className="tabular-nums text-muted">
                  {formatQty(line.quantity, line.inventoryItem.baseUnit)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          startIcon={<Plus className="h-4 w-4" />}
          onClick={onAddIngredient}
        >
          {isDeal ? "Add extra ingredient" : "Add ingredient"}
        </Button>
        {variant.recipes.length === 0 && otherVariants.length > 0 && (
          <div className="flex items-center gap-2">
            <Select
              aria-label="Copy recipe from"
              options={otherVariants.map((v) => ({ value: String(v.id), label: `Copy from ${v.name}` }))}
              placeholder="Copy from…"
              value={copyFrom}
              onChange={(e) => setCopyFrom(e.target.value)}
              containerClassName="w-40"
              className="h-9 text-sm"
            />
            <Button
              size="sm"
              variant="ghost"
              aria-label="Copy recipe"
              className="px-2"
              disabled={!copyFrom}
              isLoading={isPending}
              onClick={handleCopy}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
