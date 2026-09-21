"use client";

import { useState, useTransition } from "react";
import { PackageX, RotateCcw } from "lucide-react";
import toast from "react-hot-toast";
import { toggleItemAvailabilityAction } from "@/app/(app)/pos/actions";
import Banner from "@/components/common/Banner";
import BottomSheet from "@/components/common/BottomSheet";
import Button from "@/components/common/Button";
import Chips from "@/components/common/Chips";
import Input from "@/components/common/Input";
import NumberStepper from "@/components/common/NumberStepper";
import type { CatalogItem } from "@/server/orders/queries";
import { callAction } from "@/utils/call-action";
import { formatMoney } from "@/utils/helper";
import { useCart } from "../cart-store";

interface ItemSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: CatalogItem;
  /** Size preselected when the sheet opens (the chip picked on the card); defaults to the first size. */
  initialVariantId?: number;
  /** Optimistic sold-out toggle owned by the screen (keeps the grid in sync at once). */
  onAvailabilityChange: (itemId: number, isAvailable: boolean) => void;
}

/** Size + quantity + note for a single item. Parents remount it with a new `key` per open. */
export default function ItemSheet({ open, onOpenChange, item: itemProp, initialVariantId, onAvailabilityChange }: ItemSheetProps) {
  const addLine = useCart((s) => s.addLine);
  // Snapshot for the life of this mount so the sheet does not flip while sliding out.
  const [item] = useState(itemProp);
  const [variantId, setVariantId] = useState<string>(String(initialVariantId ?? item?.variants[0]?.id ?? ""));
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
    onOpenChange(false);
  };

  const setAvailability = async (next: boolean) => {
    onAvailabilityChange(item.id, next); // optimistic; reverts by itself if the action fails
    return callAction(toggleItemAvailabilityAction(item.id, next));
  };

  const toggleAvailability = () => {
    const next = !item.isAvailable;
    onOpenChange(false);
    startTransition(async () => {
      const result = await setAvailability(next);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (next) {
        toast.success(`${item.name} is back on sale`);
        return;
      }
      // Sold out hides the item on every phone, so a mis-tap gets a way back.
      toast(
        (t) => (
          <span className="flex items-center gap-2">
            {item.name} marked sold out
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                toast.dismiss(t.id);
                void setAvailability(true).then((undone) => {
                  if (!undone.ok) toast.error(undone.error);
                });
              }}
            >
              Undo
            </Button>
          </span>
        ),
        { duration: 6000 }
      );
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
            Add {quantity > 1 ? `${quantity} ` : ""}· {formatMoney(total)}
          </Button>
        ) : (
          <Button size="lg" variant="outline" className="w-full" isLoading={isPending} startIcon={<RotateCcw className="h-5 w-5" />} onClick={toggleAvailability}>
            Back on sale
          </Button>
        )
      }
    >
      {!item.isAvailable ? (
        <Banner tone="danger">
          Marked sold out. It cannot be added to orders until it is back on sale.
        </Banner>
      ) : (
        <div className="space-y-5">
          {item.variants.length > 1 && (
            <div className="space-y-1">
              <Chips
                label="Size"
                wrap
                value={String(variant.id)}
                onChange={setVariantId}
                options={item.variants.map((v) => ({ value: String(v.id), label: v.name, hint: formatMoney(v.price).replace("Rs ", "") }))}
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

          <Button
            size="sm"
            variant="ghost"
            className="-ml-3 text-muted"
            startIcon={<PackageX className="h-4 w-4" />}
            isLoading={isPending}
            onClick={toggleAvailability}
          >
            Kitchen ran out? Mark sold out
          </Button>
        </div>
      )}
    </BottomSheet>
  );
}
