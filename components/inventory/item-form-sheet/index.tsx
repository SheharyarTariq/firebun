"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import {
  createInventoryItemAction,
  deleteInventoryItemAction,
  updateInventoryItemAction,
} from "@/app/(app)/(admin)/inventory/actions";
import { removeRecipeLineAction } from "@/app/(app)/(admin)/menu/actions";
import Banner from "@/components/common/Banner";
import BottomSheet from "@/components/common/BottomSheet";
import Button from "@/components/common/Button";
import Card from "@/components/common/Card";
import ConfirmSheet from "@/components/common/ConfirmSheet";
import Input from "@/components/common/Input";
import ListRow from "@/components/common/ListRow";
import SectionHeading from "@/components/common/SectionHeading";
import Select from "@/components/common/Select";
import Toggle from "@/components/common/Toggle";
import type { InventoryItem } from "@/db/schema";
import type { RecipeUsage } from "@/server/inventory/queries";
import { callAction } from "@/utils/call-action";
import {
  DEFAULT_PACK_LABEL,
  DISPLAY_UNITS_FOR_BASE,
  fromBaseQty,
  unitFactor,
  type BaseUnit,
  type DisplayUnit,
} from "@/utils/helper";
import { routes } from "@/utils/routes";
import { validateAndSetErrors } from "@/utils/validation";
import { inventoryItemSchema, type InventoryItemFormInput } from "../schema";

interface ItemFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present when editing. */
  item?: InventoryItem;
  /** Editing only: false once the item has movements (unit is then locked). */
  canChangeBaseUnit?: boolean;
  /** Editing only: why a delete would be refused, so the sheet can say so up front. */
  deleteBlock?: { recipeUsages: RecipeUsage[]; usedInOrders: boolean; purchases: number; movements: number };
}

const BASE_UNIT_OPTIONS = [
  { value: "g", label: "Weight — grams / kg (cheese, flour)" },
  { value: "ml", label: "Volume — ml / litres (milk, oil)" },
  { value: "pcs", label: "Pieces (buns, bottles, wings)" },
];

const toNumberOrNull = (value: string): number | null =>
  value.trim() === "" ? null : Number(value);

/**
 * Form state is initialised once from `item`; parents remount the sheet with a new `key`
 * each time they open it so the form always starts fresh.
 */
export default function ItemFormSheet({
  open,
  onOpenChange,
  item,
  canChangeBaseUnit = true,
  deleteBlock,
}: ItemFormSheetProps) {
  const router = useRouter();
  const isEdit = Boolean(item);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [name, setName] = useState(item?.name ?? "");
  const [baseUnit, setBaseUnit] = useState<BaseUnit>(item?.baseUnit ?? "pcs");
  const [displayUnit, setDisplayUnit] = useState<DisplayUnit>(item?.displayUnit ?? "pcs");
  const [threshold, setThreshold] = useState(
    item && item.lowStockThreshold !== null
      ? String(fromBaseQty(item.lowStockThreshold, item.displayUnit))
      : ""
  );
  const [packSize, setPackSize] = useState(
    item && item.packSize !== null ? String(fromBaseQty(item.packSize, item.displayUnit)) : ""
  );
  const [packLabel, setPackLabel] = useState(item?.packLabel ?? "");
  const [isActive, setIsActive] = useState(item?.isActive ?? true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  const clearError = (field: string) => {
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const displayOptions = DISPLAY_UNITS_FOR_BASE[baseUnit].map((u) => ({ value: u, label: u }));

  const handleBaseUnitChange = (next: BaseUnit) => {
    setBaseUnit(next);
    setDisplayUnit(DISPLAY_UNITS_FOR_BASE[next][0]);
    clearError("baseUnit");
  };

  // The limit and pack size are typed in the display unit, so switching it re-expresses what is
  // already typed (5 kg → 5000 g) instead of silently reading "5" as 5 g.
  const handleDisplayUnitChange = (next: DisplayUnit) => {
    const rescale = (raw: string) => {
      const n = toNumberOrNull(raw);
      if (n === null || !Number.isFinite(n)) return raw;
      return String(Number(((n * unitFactor(displayUnit)) / unitFactor(next)).toPrecision(12)));
    };
    setThreshold(rescale);
    setPackSize(rescale);
    setDisplayUnit(next);
    clearError("displayUnit");
  };

  const handleSubmit = async () => {
    // Threshold and pack size are typed in the display unit; the server stores base units.
    const factor = unitFactor(displayUnit);
    const thresholdValue = toNumberOrNull(threshold);
    const packSizeValue = toNumberOrNull(packSize);
    const values: InventoryItemFormInput = {
      name,
      baseUnit,
      displayUnit,
      lowStockThreshold: thresholdValue === null ? null : thresholdValue * factor,
      packSize: packSizeValue === null ? null : packSizeValue * factor,
      packLabel: packSizeValue === null ? null : packLabel.trim() || DEFAULT_PACK_LABEL,
      isActive,
    };
    if (!(await validateAndSetErrors(inventoryItemSchema, values, setErrors))) return;

    startTransition(async () => {
      const result = item
        ? await callAction(updateInventoryItemAction(item.id, values))
        : await callAction(createInventoryItemAction(values));
      if (!result.ok) {
        if (result.fieldErrors) setErrors(result.fieldErrors);
        toast.error(result.error);
        return;
      }
      toast.success(`${name.trim()} ${item ? "updated" : "added"}`);
      onOpenChange(false);
      if (!item && result.data) router.push(routes.ui.inventoryItemDetails(result.data.id));
    });
  };

  const handleDelete = () => {
    if (!item) return;
    startTransition(async () => {
      const result = await callAction(deleteInventoryItemAction(item.id));
      if (!result.ok) {
        toast.error(result.error);
        setConfirmDelete(false);
        return;
      }
      toast.success(`${item.name} deleted`);
      onOpenChange(false);
      router.push(routes.ui.inventory);
    });
  };

  /** Archiving from the blocked sheet, so the way out is one tap instead of a hunt for the toggle. */
  const handleArchive = () => {
    if (!item) return;
    startTransition(async () => {
      const result = await callAction(
        updateInventoryItemAction(item.id, {
          name: item.name,
          baseUnit: item.baseUnit,
          displayUnit: item.displayUnit,
          lowStockThreshold: item.lowStockThreshold,
          packSize: item.packSize,
          packLabel: item.packLabel,
          isActive: false,
        })
      );
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`${item.name} archived`);
      setConfirmDelete(false);
      onOpenChange(false);
      router.push(routes.ui.inventory);
    });
  };

  const recipeUsages = deleteBlock?.recipeUsages ?? [];
  /**
   * Only worth offering when clearing the recipes would really let the delete through.
   * For an item that has been sold, order history blocks it anyway, so removing it from a
   * recipe would stop that menu item deducting stock and still leave the delete refused.
   */
  const removingUnblocks = Boolean(deleteBlock) && !deleteBlock!.usedInOrders && recipeUsages.length > 0;
  const [removingRecipeId, setRemovingRecipeId] = useState<number | null>(null);

  const handleRemoveFromRecipe = (usage: RecipeUsage) => {
    setRemovingRecipeId(usage.recipeId);
    startTransition(async () => {
      const result = await callAction(removeRecipeLineAction(usage.recipeId));
      setRemovingRecipeId(null);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      // The action revalidates, so `deleteBlock` arrives updated and the sheet re-renders:
      // once the last recipe goes, `blockedReason` clears and this becomes a real Delete.
      toast.success(`Removed from ${usage.menuItemName}`);
    });
  };
  // Menu items that can still be sold keep deducting this ingredient after it is archived.
  const liveRecipes = recipeUsages.filter((r) => r.isLive);
  // Orders come first: clearing the recipes would not unblock an item that has been sold, so
  // promising "remove it from them to delete it" there would be a lie.
  const blockedReason = !deleteBlock
    ? null
    : deleteBlock.usedInOrders
      ? "Orders have already used it, so its history has to stay. Archiving keeps that history and takes it off your lists."
      : recipeUsages.length > 0
        ? `${recipeUsages.length === 1 ? "A recipe still uses it. Remove it from that recipe" : `${recipeUsages.length} recipes still use it. Remove it from them`} to delete it, or archive it — it stays out of your way and keeps its history.`
        : null;
  const deleteConsequence = deleteBlock
    ? [
        deleteBlock.purchases > 0 ? `${deleteBlock.purchases} purchase${deleteBlock.purchases === 1 ? "" : "s"}` : null,
        deleteBlock.movements > 0 ? `${deleteBlock.movements} ledger entr${deleteBlock.movements === 1 ? "y" : "ies"}` : null,
      ]
        .filter(Boolean)
        .join(" and ")
    : "";

  return (
    <>
    {item && (
      <ConfirmSheet
        open={confirmDelete}
        onOpenChange={(next) => !next && setConfirmDelete(false)}
        title={blockedReason ? `${item.name} can’t be deleted` : `Delete ${item.name}?`}
        description={
          blockedReason ??
          (deleteConsequence ? `Its ${deleteConsequence} are deleted with it. This cannot be undone.` : "This cannot be undone.")
        }
        confirmLabel={blockedReason ? "OK" : "Delete"}
        cancelLabel={blockedReason ? "Not now" : "Cancel"}
        destructive={!blockedReason}
        isLoading={isPending}
        onConfirm={blockedReason ? () => setConfirmDelete(false) : handleDelete}
        alternative={blockedReason ? { label: "Archive instead", onConfirm: handleArchive, isLoading: isPending } : undefined}
      >
        {blockedReason && (
          <div className="space-y-3">
            {recipeUsages.length > 0 && (
              <div className="space-y-1">
                <SectionHeading>Used in</SectionHeading>
                <Card className="divide-y divide-border p-0">
                  {recipeUsages.map((r) => (
                    <ListRow
                      key={r.recipeId}
                      href={removingUnblocks ? undefined : routes.ui.menuItemDetails(r.menuItemId)}
                      dense
                      trailing={
                        removingUnblocks ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-danger"
                            isLoading={removingRecipeId === r.recipeId}
                            disabled={isPending}
                            onClick={() => handleRemoveFromRecipe(r)}
                          >
                            Remove
                          </Button>
                        ) : (
                          "chevron"
                        )
                      }
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{r.menuItemName}</span>
                        <span className="block text-xs text-muted">
                          {r.variantName === "Regular" ? "Recipe" : `${r.variantName} · recipe`}
                          {!r.isLive && " · hidden"}
                        </span>
                      </span>
                    </ListRow>
                  ))}
                </Card>
              </div>
            )}
            {removingUnblocks && (
              <Banner tone="info">
                Removing it means that menu item stops deducting this ingredient when it is sold. You can add it back
                to the recipe at any time.
              </Banner>
            )}
            {!removingUnblocks && liveRecipes.length > 0 && (
              <Banner tone="warning">
                {liveRecipes.length === 1
                  ? `${liveRecipes[0].menuItemName} is still on the menu and uses this, so its sales will keep deducting stock after archiving.`
                  : `${liveRecipes.length} of these are still on the menu, so their sales will keep deducting stock after archiving.`}
              </Banner>
            )}
          </div>
        )}
      </ConfirmSheet>
    )}
    <BottomSheet
      open={open && !confirmDelete}
      onOpenChange={onOpenChange}
      guardUnsaved
      title={isEdit ? "Edit item" : "New inventory item"}
      description={
        isEdit
          ? undefined
          : "After adding it, use Count to enter what you have now, or Purchase when you buy more."
      }
      footer={
        <div className="flex gap-2">
          {isEdit && (
            <Button variant="outline" size="lg" aria-label="Delete item" className="px-4 text-danger" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-5 w-5" />
            </Button>
          )}
          <Button size="lg" className="flex-1" isLoading={isPending} onClick={handleSubmit}>
            {isEdit ? "Save" : "Add item"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Input
          label="Name"
          placeholder="e.g. Chicken wings"
          autoComplete="off"
          autoCapitalize="words"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            clearError("name");
          }}
          error={errors.name}
        />

        <Select
          label="Counted by"
          options={BASE_UNIT_OPTIONS}
          value={baseUnit}
          disabled={isEdit && !canChangeBaseUnit}
          onChange={(e) => handleBaseUnitChange(e.target.value as BaseUnit)}
          error={errors.baseUnit}
          hint={
            isEdit && !canChangeBaseUnit
              ? "Locked because this item already has stock movements."
              : undefined
          }
        />

        {displayOptions.length > 1 && (
          <Select
            label="Stock and prices shown per"
            options={displayOptions}
            value={displayUnit}
            onChange={(e) => handleDisplayUnitChange(e.target.value as DisplayUnit)}
            error={errors.displayUnit}
          />
        )}

        <Input
          label={`Low-stock limit (${displayUnit})`}
          inputMode="decimal"
          placeholder="Leave empty for no alert"
          value={threshold}
          onChange={(e) => {
            setThreshold(e.target.value);
            clearError("lowStockThreshold");
          }}
          error={errors.lowStockThreshold}
          hint="The item is marked “Needed” when stock is at or below this."
        />

        <fieldset className="space-y-3 rounded-field border border-border p-3">
          <legend className="px-1 text-sm font-medium">Bought in packs? (optional)</legend>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={`Pack size (${displayUnit})`}
              inputMode="decimal"
              placeholder="e.g. 50"
              value={packSize}
              onChange={(e) => {
                setPackSize(e.target.value);
                clearError("packSize");
              }}
              error={errors.packSize}
            />
            <Input
              label="Pack name"
              placeholder={DEFAULT_PACK_LABEL}
              autoComplete="off"
              value={packLabel}
              onChange={(e) => {
                setPackLabel(e.target.value);
                clearError("packLabel");
              }}
              error={errors.packLabel}
            />
          </div>
          <p className="text-xs text-muted">
            Lets you record purchases as “2 packets for Rs 3,000” — the price per {displayUnit}{" "}
            is worked out for you.
          </p>
        </fieldset>

        {isEdit && (
          <Toggle
            label="In use"
            description="Switch off to archive: hidden from lists and recipes, history kept."
            checked={isActive}
            onChange={setIsActive}
          />
        )}
      </div>
    </BottomSheet>
    </>
  );
}
