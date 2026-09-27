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
import Card from "@/components/common/Card";
import ConfirmSheet from "@/components/common/ConfirmSheet";
import Input from "@/components/common/Input";
import ListRow from "@/components/common/ListRow";
import SectionHeading from "@/components/common/SectionHeading";
import Toggle from "@/components/common/Toggle";
import type { VariantDealUsage, VariantFull } from "@/server/menu/queries";
import { callAction } from "@/utils/call-action";
import { parseNumberInput } from "@/utils/helper";
import { routes } from "@/utils/routes";
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
  /** The item has only this size, so "Regular" is just "the price". */
  sole: boolean;
  /**
   * Editing only: what a delete would cost and the one thing that can still refuse it. Sold
   * lines no longer block — they keep their own snapshots — so they are stated as the
   * consequence instead; a deal is live configuration and does block.
   */
  deleteBlock?: {
    soldLines: number;
    dealUsages: VariantDealUsage[];
    /** Other sizes still on the menu: `updateVariant` refuses to hide the last active one. */
    activeSiblings: number;
  };
}

/** Parents remount this with a new `key` on each open so the form starts fresh. */
export default function VariantSheet({
  open,
  onOpenChange,
  itemId,
  variant,
  isDealPrice,
  sole,
  deleteBlock,
}: VariantSheetProps) {
  // A lone size named something else keeps its field so it can be renamed back.
  const hideName = isDealPrice || (sole && variant?.name === "Regular");
  const [name, setName] = useState(variant?.name ?? "");
  const [price, setPrice] = useState(variant ? String(variant.price) : "");
  const [isActive, setIsActive] = useState(variant?.isActive ?? true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  const clearError = (field: string) => {
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  /** The form as the server wants it. `active` lets Hide save the typed edits too. */
  const buildValues = (active = isActive) => ({
    name: hideName ? "Regular" : name,
    price: parseNumberInput(price),
    isActive: active,
  });

  const handleSubmit = async () => {
    const values = buildValues();
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
      toast.success(variant ? `${values.name === "Regular" ? "Price" : values.name} saved` : `${values.name} added`);
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

  /** The way out when history blocks the delete: keep the size, take it off the menu. */
  const handleHide = async () => {
    if (!variant) return;
    const values = buildValues(false);
    if (!(await validateAndSetErrors(variantSchema, values, setErrors))) {
      setConfirmDelete(false);
      return;
    }
    startTransition(async () => {
      const result = await callAction(updateVariantAction(variant.id, values));
      if (!result.ok) {
        if (result.fieldErrors) setErrors(result.fieldErrors);
        toast.error(result.error);
        return;
      }
      toast.success(`${variant.name === "Regular" ? "Price" : variant.name} hidden`);
      setConfirmDelete(false);
      onOpenChange(false);
    });
  };

  const dealUsages = deleteBlock?.dealUsages ?? [];
  // A deal is the only thing left that can refuse a delete: it is live configuration, and a
  // slot cannot be left with no options. Past orders no longer block anything — they keep
  // their own name, size and price, so they survive the size being deleted.
  const blockedReason =
    !deleteBlock || !variant || dealUsages.length === 0
      ? null
      : `${dealUsages.length === 1 ? "A deal offers this size" : `${dealUsages.length} deals offer this size`}. Take it out of ${dealUsages.length === 1 ? "that deal" : "them"} to delete it, or hide it — it comes off the counter and keeps its history.`;
  // Hiding the only active size is refused by `updateVariant`, so it is not offered there.
  const canOfferHide = Boolean(blockedReason) && (deleteBlock?.activeSiblings ?? 0) > 0;
  const recipeCount = variant?.recipes.length ?? 0;
  const soldLines = deleteBlock?.soldLines ?? 0;
  // Deleting is permanent, and a sold size is exactly where the owner needs to know what does
  // and does not survive it.
  const deleteConsequence = [
    soldLines > 0
      ? `It has been sold in ${soldLines} order line${soldLines === 1 ? "" : "s"}. Those bills keep their name and price`
      : null,
    recipeCount > 0 ? `its recipe (${recipeCount} ingredient${recipeCount === 1 ? "" : "s"}) goes with it` : null,
  ].filter(Boolean);

  return (
    <>
    {variant && (
      <ConfirmSheet
        open={confirmDelete}
        onOpenChange={(next) => !next && setConfirmDelete(false)}
        title={blockedReason ? `“${variant.name}” can’t be deleted` : `Delete size “${variant.name}”?`}
        description={
          blockedReason ??
          (deleteConsequence.length > 0
            ? `${deleteConsequence.join(", but ")}. This cannot be undone.`
            : "This cannot be undone.")
        }
        confirmLabel="Delete"
        cancelLabel={blockedReason ? "Not now" : "Cancel"}
        destructive={!blockedReason}
        isLoading={isPending}
        // Nothing here can be cleared from inside this sheet, so a blocked delete with no
        // alternative leaves only the way back.
        confirmHidden={Boolean(blockedReason)}
        onConfirm={handleDelete}
        alternative={canOfferHide ? { label: "Hide instead", onConfirm: handleHide, isLoading: isPending } : undefined}
      >
        {blockedReason && dealUsages.length > 0 && (
          <div className="space-y-1">
            <SectionHeading>Offered in</SectionHeading>
            <Card className="divide-y divide-border p-0">
              {dealUsages.map((d) => (
                <ListRow
                  key={`${d.dealItemId}-${d.slotLabel}`}
                  href={routes.ui.menuItemDetails(d.dealItemId)}
                  dense
                  trailing="chevron"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{d.dealName}</span>
                    <span className="block text-xs text-muted">
                      {d.slotLabel}
                      {!d.isLive && " · hidden"}
                    </span>
                  </span>
                </ListRow>
              ))}
            </Card>
          </div>
        )}
      </ConfirmSheet>
    )}
    <BottomSheet
      onSubmit={handleSubmit}
      open={open && !confirmDelete}
      onOpenChange={onOpenChange}
      guardUnsaved
      title={isDealPrice ? "Deal price" : hideName ? "Edit price" : variant ? `Edit ${variant.name}` : "New size"}
      footer={
        <Button size="lg" className="w-full" isLoading={isPending} type="submit">
          {variant ? "Save" : "Add size"}
        </Button>
      }
    >
      <div className="space-y-4">
        {!hideName && (
          <Input
            label="Size name"
            placeholder="e.g. M, Large, 1.5 Litre"
            autoComplete="off"
            autoCapitalize="words"
            data-autofocus={variant ? undefined : "true"}
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
          data-autofocus={hideName || variant ? "true" : undefined}
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
              label="Show on the menu"
              description="Hidden sizes stay in history but cannot be ordered."
              checked={isActive}
              onChange={setIsActive}
            />
            {/*
              With one size there is no size to delete — this sheet is the item's price, which
              is why it hides the name field above. Deleting belongs to the item itself, so the
              control is not offered here rather than offered and then refused.
            */}
            {sole ? (
              <p className="text-center text-xs text-muted">
                This is the item’s only size. To remove it, delete the whole item from Edit.
              </p>
            ) : (
              <Button
                variant="ghost"
                className="w-full text-danger"
                startIcon={<Trash2 className="h-4 w-4" />}
                onClick={() => setConfirmDelete(true)}
              >
                Delete size
              </Button>
            )}
          </>
        )}
      </div>
    </BottomSheet>
    </>
  );
}
