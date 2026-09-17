"use client";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { toggleItemAvailabilityAction } from "@/app/(app)/pos/actions";
import BottomSheet from "@/components/common/BottomSheet";
import Button from "@/components/common/Button";
import Chips from "@/components/common/Chips";
import Input from "@/components/common/Input";
import NumberStepper from "@/components/common/NumberStepper";
import type { CatalogItem } from "@/server/orders/queries";
import { formatMoney } from "@/utils/helper";
import { useCart } from "../cart-store";

interface ItemSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: CatalogItem;
}

/** Size + quantity + note for a single item. Parents remount it with a new `key` per open. */
export default function ItemSheet({ open, onOpenChange, item }: ItemSheetProps) {
  const addLine = useCart((s) => s.addLine);
  const [variantId, setVariantId] = useState<string>(String(item?.variants[0]?.id ?? ""));
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();

  if (!item) return null;
  const variant = item.variants.find((v) => String(v.id) === variantId) ?? item.variants[0];
  const total = variant.price * quantity;

  const handleAdd = () => {
    addLine({
      menuItemId: item.id,
      variantId: variant.id,
      kind: "single",
      name: item.name,
      variantName: variant.name,
      unitPrice: variant.price,
      quantity,
      note: note.trim() || null,
      dealChoices: [],
    });
    toast.success(`${quantity} × ${item.name}${variant.name !== "Regular" ? ` (${variant.name})` : ""} added`);
    onOpenChange(false);
  };

  const toggleAvailability = () => {
    startTransition(async () => {
      const result = await toggleItemAvailabilityAction(item.id, !item.isAvailable);
      if (!result.ok) toast.error(result.error);
      else toast.success(item.isAvailable ? `${item.name} marked sold out` : `${item.name} is back on sale`);
      onOpenChange(false);
    });
  };

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={item.name}
      description={item.description ?? undefined}
      footer={
        item.isAvailable ? (
          <Button size="lg" className="w-full" onClick={handleAdd}>
            Add · {formatMoney(total)}
          </Button>
        ) : (
          <Button size="lg" variant="secondary" className="w-full" isLoading={isPending} onClick={toggleAvailability}>
            Mark as available again
          </Button>
        )
      }
    >
      <div className="space-y-5">
        {item.variants.length > 1 && (
          <div className="space-y-2">
            <span className="block text-sm font-medium">Size</span>
            <Chips
              aria-label="Size"
              value={String(variant.id)}
              onChange={setVariantId}
              options={item.variants.map((v) => ({ value: String(v.id), label: `${v.name} · ${formatMoney(v.price).replace("Rs ", "")}` }))}
            />
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Quantity</span>
          <NumberStepper value={quantity} min={1} max={99} onChange={setQuantity} />
        </div>

        <Input
          label="Note for the kitchen (optional)"
          placeholder="e.g. extra spicy, no onions"
          autoComplete="off"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        {item.isAvailable && (
          <button
            type="button"
            className="text-xs text-muted underline"
            disabled={isPending}
            onClick={toggleAvailability}
          >
            Kitchen ran out? Mark {item.name} as sold out
          </button>
        )}
      </div>
    </BottomSheet>
  );
}
