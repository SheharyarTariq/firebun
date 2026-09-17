"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import {
  addVariantAction,
  deleteVariantAction,
  updateVariantAction,
} from "@/app/(app)/(admin)/menu/actions";
import BottomSheet from "@/components/common/BottomSheet";
import Button from "@/components/common/Button";
import ConfirmSheet from "@/components/common/ConfirmSheet";
import Input from "@/components/common/Input";
import Toggle from "@/components/common/Toggle";
import type { VariantFull } from "@/server/menu/queries";
import { callAction } from "@/utils/call-action";
import { validateAndSetErrors } from "@/utils/validation";
import { variantSchema } from "../../schema";

interface VariantSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: number;
  /** Present when editing. */
  variant?: VariantFull;
  /** Deals have one "size": hide the name and delete. */
  isDealPrice: boolean;
}

/** Parents remount this with a new `key` on each open so the form starts fresh. */
export default function VariantSheet({
  open,
  onOpenChange,
  itemId,
  variant,
  isDealPrice,
}: VariantSheetProps) {
  const [name, setName] = useState(variant?.name ?? "");
  const [price, setPrice] = useState(variant ? String(variant.price) : "");
  const [isActive, setIsActive] = useState(variant?.isActive ?? true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  const clearError = (field: string) => {
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleSubmit = async () => {
    const values = { name: isDealPrice ? "Regular" : name, price: Number(price), isActive };
    if (!(await validateAndSetErrors(variantSchema, values, setErrors))) return;
    startTransition(async () => {
      const result = variant
        ? await callAction(updateVariantAction(variant.id, values))
        : await callAction(addVariantAction(itemId, values));
      if (!result.ok) {
        if (result.fieldErrors) setErrors(result.fieldErrors);
        toast.error(result.error);
        return;
      }
      toast.success(variant ? "Saved" : "Size added");
      onOpenChange(false);
    });
  };

  const handleDelete = () => {
    if (!variant) return;
    startTransition(async () => {
      const result = await callAction(deleteVariantAction(variant.id));
      if (!result.ok) {
        toast.error(result.error);
        setConfirmDelete(false);
        return;
      }
      toast.success("Size deleted");
      setConfirmDelete(false);
      onOpenChange(false);
    });
  };

  if (confirmDelete && variant) {
    return (
      <ConfirmSheet
        open
        onOpenChange={(next) => !next && setConfirmDelete(false)}
        title={`Delete size “${variant.name}”?`}
        description="Its recipe is deleted too. Sizes used in past orders or deals cannot be deleted — deactivate them instead."
        confirmLabel="Delete"
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
      title={isDealPrice ? "Deal price" : variant ? `Edit ${variant.name}` : "New size"}
      footer={
        <Button size="lg" className="w-full" isLoading={isPending} onClick={handleSubmit}>
          {variant ? "Save" : "Add size"}
        </Button>
      }
    >
      <div className="space-y-4">
        {!isDealPrice && (
          <Input
            label="Size name"
            placeholder="e.g. M, Large, 1.5 Litre"
            autoComplete="off"
            autoFocus={!variant}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              clearError("name");
            }}
            error={errors.name}
          />
        )}
        <Input
          label="Price (Rs)"
          inputMode="decimal"
          placeholder="0"
          autoFocus={isDealPrice || Boolean(variant)}
          value={price}
          onChange={(e) => {
            setPrice(e.target.value);
            clearError("price");
          }}
          error={errors.price}
        />
        {variant && !isDealPrice && (
          <>
            <Toggle
              label="Active"
              description="Inactive sizes stay in history but cannot be ordered."
              checked={isActive}
              onChange={setIsActive}
            />
            <Button
              variant="ghost"
              className="w-full text-danger"
              startIcon={<Trash2 className="h-4 w-4" />}
              onClick={() => setConfirmDelete(true)}
            >
              Delete size
            </Button>
          </>
        )}
      </div>
    </BottomSheet>
  );
}
