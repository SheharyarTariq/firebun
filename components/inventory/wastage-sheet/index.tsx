"use client";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { recordWastageAction } from "@/app/(app)/(admin)/inventory/actions";
import BottomSheet from "@/components/common/BottomSheet";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import type { InventoryItem } from "@/db/schema";
import { entryUnitOptions, formatQty, type EntryUnit } from "@/utils/helper";
import { validateAndSetErrors } from "@/utils/validation";
import { wastageSchema, type WastageFormInput } from "../schema";

interface WastageSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: InventoryItem;
}

/** Parents remount this with a new `key` on each open so the form starts empty. */
export default function WastageSheet({ open, onOpenChange, item }: WastageSheetProps) {
  const unitOptions = entryUnitOptions(item);
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState<EntryUnit>(unitOptions[0].value);
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  const clearError = (field: string) => {
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleSubmit = async () => {
    const values: WastageFormInput = { qty: Number(qty), unit, reason };
    if (!(await validateAndSetErrors(wastageSchema, values, setErrors))) return;

    startTransition(async () => {
      const result = await recordWastageAction(item.id, values);
      if (!result.ok) {
        if (result.fieldErrors) setErrors(result.fieldErrors);
        toast.error(result.error);
        return;
      }
      toast.success(`Wastage recorded — ${formatQty(result.data.currentQty, item.baseUnit)} left`);
      onOpenChange(false);
    });
  };

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Record wastage"
      description={`${item.name} · currently ${formatQty(item.currentQty, item.baseUnit)}`}
      footer={
        <Button
          size="lg"
          variant="danger"
          className="w-full"
          isLoading={isPending}
          onClick={handleSubmit}
        >
          Record wastage
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <Input
            label="Quantity wasted"
            inputMode="decimal"
            placeholder="0"
            autoFocus
            value={qty}
            onChange={(e) => {
              setQty(e.target.value);
              clearError("qty");
            }}
            error={errors.qty}
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
        <Input
          label="Reason"
          placeholder="e.g. Expired, dropped, burnt"
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
