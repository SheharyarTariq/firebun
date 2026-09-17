"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  createInventoryItemAction,
  updateInventoryItemAction,
} from "@/app/(app)/(admin)/inventory/actions";
import BottomSheet from "@/components/common/BottomSheet";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import type { InventoryItem } from "@/db/schema";
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
}

const BASE_UNIT_OPTIONS = [
  { value: "g", label: "Weight (grams / kg)" },
  { value: "ml", label: "Volume (ml / litres)" },
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
}: ItemFormSheetProps) {
  const router = useRouter();
  const isEdit = Boolean(item);

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
        ? await updateInventoryItemAction(item.id, values)
        : await createInventoryItemAction(values);
      if (!result.ok) {
        if (result.fieldErrors) setErrors(result.fieldErrors);
        toast.error(result.error);
        return;
      }
      toast.success(item ? "Item updated" : "Item added");
      onOpenChange(false);
      if (!item && result.data) router.push(routes.ui.inventoryItemDetails(result.data.id));
    });
  };

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Edit item" : "New inventory item"}
      description={
        isEdit
          ? undefined
          : "After adding it, use Count to enter what you have now, or Purchase when you buy more."
      }
      footer={
        <Button size="lg" className="w-full" isLoading={isPending} onClick={handleSubmit}>
          {isEdit ? "Save changes" : "Add item"}
        </Button>
      }
    >
      <div className="space-y-4">
        <Input
          label="Name"
          placeholder="e.g. Chicken wings"
          autoComplete="off"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            clearError("name");
          }}
          error={errors.name}
        />

        <Select
          label="Measured in"
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
            label="Show quantities in"
            options={displayOptions}
            value={displayUnit}
            onChange={(e) => {
              setDisplayUnit(e.target.value as DisplayUnit);
              clearError("displayUnit");
            }}
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
          <label className="flex items-center justify-between rounded-field border border-border px-4 py-3">
            <span className="text-sm font-medium">Active</span>
            <input
              type="checkbox"
              className="h-5 w-5 accent-brand-strong"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
          </label>
        )}
      </div>
    </BottomSheet>
  );
}
