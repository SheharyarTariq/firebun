"use client";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { setStockCountAction } from "@/app/(app)/(admin)/inventory/actions";
import BottomSheet from "@/components/common/BottomSheet";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import type { InventoryItem } from "@/db/schema";
import { callAction } from "@/utils/call-action";
import { cn } from "@/utils/cn";
import {
  entryQtyToBase,
  entryUnitOptions,
  formatQty,
  type EntryUnit,
} from "@/utils/helper";
import { validateAndSetErrors } from "@/utils/validation";
import { stockCountSchema, type StockCountFormInput } from "../schema";

interface StockCountSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: InventoryItem;
}

/** Parents remount this with a new `key` on each open so the form starts empty. */
export default function StockCountSheet({ open, onOpenChange, item }: StockCountSheetProps) {
  const unitOptions = entryUnitOptions(item);
  const [counted, setCounted] = useState("");
  const [unit, setUnit] = useState<EntryUnit>(unitOptions[0].value);
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  const clearError = (field: string) => {
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const countedNumber = counted.trim() === "" ? null : Number(counted);
  const delta =
    countedNumber !== null && Number.isFinite(countedNumber)
      ? entryQtyToBase(item, countedNumber, unit) - item.currentQty
      : null;

  const handleSubmit = async () => {
    const values: StockCountFormInput = { countedQty: Number(counted), unit, reason };
    if (!(await validateAndSetErrors(stockCountSchema, values, setErrors))) return;

    startTransition(async () => {
      const result = await callAction(setStockCountAction(item.id, values));
      if (!result.ok) {
        if (result.fieldErrors) setErrors(result.fieldErrors);
        toast.error(result.error);
        return;
      }
      toast.success(`Stock set to ${formatQty(result.data.currentQty, item.baseUnit)}`);
      onOpenChange(false);
    });
  };

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Stock count"
      description={`${item.name} · currently ${formatQty(item.currentQty, item.baseUnit)}`}
      footer={
        <Button size="lg" className="w-full" isLoading={isPending} onClick={handleSubmit}>
          Save
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <Input
            label="Counted quantity"
            inputMode="decimal"
            placeholder="0"
            data-autofocus="true"
            value={counted}
            onChange={(e) => {
              setCounted(e.target.value);
              clearError("countedQty");
            }}
            error={errors.countedQty}
          />
          <Select
            label="Unit"
            options={unitOptions}
            value={unit}
            containerClassName="w-32"
            onChange={(e) => {
              setUnit(e.target.value as EntryUnit);
              clearError("unit");
            }}
            error={errors.unit}
          />
        </div>

        {delta !== null && (
          <p
            className={cn(
              "rounded-field px-4 py-3 text-sm",
              delta === 0
                ? "bg-muted-bg text-muted"
                : delta > 0
                  ? "bg-success-bg text-success"
                  : "bg-warning-bg text-warning"
            )}
          >
            {delta === 0
              ? "Same as current stock — nothing to adjust."
              : `${delta > 0 ? "+" : "−"}${formatQty(Math.abs(delta), item.baseUnit)} will be recorded as an adjustment.`}
          </p>
        )}

        <Input
          label="Reason"
          placeholder="e.g. Weekly count, starting stock"
          autoComplete="off"
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            clearError("reason");
          }}
          error={errors.reason}
        />
      </div>
    </BottomSheet>
  );
}
