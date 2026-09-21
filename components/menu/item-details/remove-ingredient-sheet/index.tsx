"use client";

import { useTransition } from "react";
import toast from "react-hot-toast";
import { removeRecipeLineAction } from "@/app/(app)/(admin)/menu/actions";
import ConfirmSheet from "@/components/common/ConfirmSheet";
import type { RecipeLine } from "@/server/menu/queries";
import { callAction } from "@/utils/call-action";

interface RemoveIngredientSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  line?: RecipeLine;
  /** Runs after the ingredient is gone, e.g. to close the edit sheet behind this one. */
  onRemoved?: () => void;
}

/** "Remove this ingredient?" confirm, shared by the recipe rows and the ingredient edit sheet. */
export default function RemoveIngredientSheet({ open, onOpenChange, line, onRemoved }: RemoveIngredientSheetProps) {
  const [isPending, startTransition] = useTransition();

  const handleRemove = () => {
    if (!line) return;
    startTransition(async () => {
      const result = await callAction(removeRecipeLineAction(line.id));
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Ingredient removed");
      onOpenChange(false);
      onRemoved?.();
    });
  };

  return (
    <ConfirmSheet
      open={open}
      onOpenChange={onOpenChange}
      title={line ? `Remove ${line.inventoryItem.name}?` : "Remove ingredient?"}
      description="It will no longer be deducted from stock when this is sold."
      confirmLabel="Remove"
      destructive
      isLoading={isPending}
      onConfirm={handleRemove}
    />
  );
}
