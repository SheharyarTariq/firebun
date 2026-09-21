"use client";

import { useId, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { recordPurchaseAction } from "@/app/(app)/(admin)/inventory/actions";
import BottomSheet from "@/components/common/BottomSheet";
import Button from "@/components/common/Button";
import Chips from "@/components/common/Chips";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import type { InventoryItem } from "@/db/schema";
import { callAction } from "@/utils/call-action";
import {
  entryQtyToBase,
  entryUnitLabel,
  entryUnitOptions,
  formatCostPerUnit,
  formatMoney,
  formatMoneyExact,
  parseNumberInput,
  toIsoDate,
  type EntryUnit,
} from "@/utils/helper";
import { validateAndSetErrors } from "@/utils/validation";
import { purchaseSchema, type PurchaseFormInput } from "../schema";

interface PurchaseSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: InventoryItem;
  /** Suppliers used before for this item, offered as suggestions. */
  suppliers?: string[];
}

type PriceMode = "unit" | "total";

/** Parents remount this with a new `key` on each open so the form starts empty. */
export default function PurchaseSheet({ open, onOpenChange, item, suppliers = [] }: PurchaseSheetProps) {
  const supplierListId = useId();
  const unitOptions = entryUnitOptions(item);
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState<EntryUnit>(unitOptions[0].value);
  const [priceMode, setPriceMode] = useState<PriceMode>("total");
  const [price, setPrice] = useState("");
  const [supplier, setSupplier] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(() => toIsoDate());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  const clearError = (field: string) => {
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const unitName = entryUnitLabel(item, unit);
  const qtyNumber = Number(qty) || 0;
  const priceNumber = Number(price) || 0;
  const total = priceMode === "unit" ? qtyNumber * priceNumber : priceNumber;
  const perEntered = qtyNumber > 0 ? total / qtyNumber : 0;
  const qtyBase = qtyNumber > 0 ? entryQtyToBase(item, qtyNumber, unit) : 0;
  const perBase = qtyBase > 0 ? total / qtyBase : null;
  const showPreview = qtyNumber > 0 && priceNumber > 0;

  const handleSubmit = async () => {
    const values: PurchaseFormInput = {
      itemId: item.id,
      enteredQty: parseNumberInput(qty),
      enteredUnit: unit,
      priceMode,
      price: parseNumberInput(price),
      supplier: supplier.trim() || undefined,
      note: note.trim() || undefined,
      purchaseDate: date,
    };
    if (!(await validateAndSetErrors(purchaseSchema, values, setErrors))) return;

    startTransition(async () => {
      const result = await callAction(recordPurchaseAction(values));
      if (!result.ok) {
        if (result.fieldErrors) setErrors(result.fieldErrors);
        toast.error(result.error);
        return;
      }
      toast.success(`Purchase recorded — ${formatMoney(total)}`);
      onOpenChange(false);
    });
  };

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      guardUnsaved
      title="Record purchase"
      description={item.name}
      footer={
        <Button size="lg" className="w-full" isLoading={isPending} onClick={handleSubmit}>
          {showPreview ? `Save purchase · ${formatMoney(total)}` : "Save purchase"}
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <Input
            label="Quantity"
            inputMode="decimal"
            placeholder="0"
            data-autofocus="true"
            value={qty}
            onChange={(e) => {
              setQty(e.target.value);
              clearError("enteredQty");
            }}
            error={errors.enteredQty}
          />
          <Select
            label="Unit"
            options={unitOptions}
            value={unit}
            containerClassName="w-32"
            onChange={(e) => {
              setUnit(e.target.value as EntryUnit);
              clearError("enteredUnit");
            }}
            error={errors.enteredUnit}
          />
        </div>

        <div className="space-y-2">
          <Chips<PriceMode>
            label="Price entered as"
            value={priceMode}
            onChange={setPriceMode}
            options={[
              { value: "total", label: "Total bill" },
              { value: "unit", label: `Per ${unitName}` },
            ]}
          />
        </div>

        <Input
          label={priceMode === "unit" ? `Price per ${unitName} (Rs)` : "Total paid (Rs)"}
          inputMode="decimal"
          placeholder="0"
          value={price}
          onChange={(e) => {
            setPrice(e.target.value);
            clearError("price");
          }}
          error={errors.price}
        />

        {showPreview && (
          <dl className="grid grid-cols-2 gap-2 rounded-field bg-surface-2 px-4 py-3 text-sm">
            <dt className="text-muted">Total</dt>
            <dd className="text-right font-semibold tabular-nums">{formatMoney(total)}</dd>
            <dt className="text-muted">Per {unitName}</dt>
            <dd className="text-right tabular-nums">{formatMoneyExact(perEntered)}</dd>
            {unit === "pack" && perBase !== null && (
              <>
                <dt className="text-muted">Per {item.displayUnit}</dt>
                <dd className="text-right tabular-nums">
                  {formatCostPerUnit(perBase, item.displayUnit)}
                </dd>
              </>
            )}
          </dl>
        )}

        <Input
          label="Supplier (optional)"
          placeholder="e.g. Metro"
          autoComplete="off"
          list={suppliers.length > 0 ? supplierListId : undefined}
          value={supplier}
          onChange={(e) => {
            setSupplier(e.target.value);
            clearError("supplier");
          }}
          error={errors.supplier}
        />
        {suppliers.length > 0 && (
          <datalist id={supplierListId}>
            {suppliers.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        )}

        <Input
          label="Date"
          type="date"
          max={toIsoDate()}
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            clearError("purchaseDate");
          }}
          error={errors.purchaseDate}
        />

        <Input
          label="Note (optional)"
          placeholder="e.g. 2 boxes"
          autoComplete="off"
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
            clearError("note");
          }}
          error={errors.note}
        />
      </div>
    </BottomSheet>
  );
}
