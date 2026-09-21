"use client";

import { useState, useTransition } from "react";
import { RotateCcw } from "lucide-react";
import toast from "react-hot-toast";
import { toggleItemAvailabilityAction } from "@/app/(app)/pos/actions";
import Banner from "@/components/common/Banner";
import BottomSheet from "@/components/common/BottomSheet";
import Button from "@/components/common/Button";
import Chips from "@/components/common/Chips";
import Input from "@/components/common/Input";
import NumberStepper from "@/components/common/NumberStepper";
import type { CatalogItem, CatalogSlot } from "@/server/orders/queries";
import { callAction } from "@/utils/call-action";
import { cn } from "@/utils/cn";
import { formatMoney } from "@/utils/helper";
import { useCart, type CartSlotChoice } from "../cart-store";

interface DealSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: CatalogItem;
  onAvailabilityChange: (itemId: number, isAvailable: boolean) => void;
}

type Pick = number | "";
type Picks = Record<number, Pick[]>;

const NONE = "";

/** One pick per unit in each slot ("Pizza 1", "Pizza 2"); fixed slots need no input. */
function initialPicks(slots: CatalogSlot[]): Picks {
  const picks: Picks = {};
  for (const slot of slots) {
    const available = slot.options.filter((o) => o.isAvailable);
    const fixed = slot.options.length === 1 ? slot.options[0].variantId : available.length === 1 ? available[0].variantId : NONE;
    picks[slot.id] = Array.from({ length: slot.quantity }, () => fixed);
  }
  return picks;
}

const optionLabel = (o: CatalogSlot["options"][number]) =>
  `${o.itemName}${o.variantName !== "Regular" ? ` · ${o.variantName}` : ""}`;

export default function DealSheet({ open, onOpenChange, item: itemProp, onAvailabilityChange }: DealSheetProps) {
  const addLine = useCart((s) => s.addLine);
  // Snapshot for the life of this mount so the sheet does not flip while sliding out.
  const [item] = useState(itemProp);
  const variant = item?.variants[0];
  const slots = variant?.slots ?? [];
  const [picks, setPicks] = useState<Picks>(() => initialPicks(slots));
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();

  if (!item || !variant) return null;

  const missing = slots.reduce((n, slot) => n + (picks[slot.id] ?? []).filter((v) => v === NONE).length, 0);

  /** Picking unit 1 also fills the units after it that are still empty or matched unit 1. */
  const setPick = (slotId: number, index: number, value: number) => {
    setPicks((prev) => {
      const units = prev[slotId];
      const previous = units[index];
      return {
        ...prev,
        [slotId]: units.map((v, i) => {
          if (i === index) return value;
          if (index === 0 && i > 0 && (v === NONE || v === previous)) return value;
          return v;
        }),
      };
    });
  };

  const handleAdd = () => {
    if (missing > 0) return;
    const dealChoices: CartSlotChoice[] = slots.map((slot) => {
      const grouped = new Map<number, number>();
      for (const v of picks[slot.id]) grouped.set(v as number, (grouped.get(v as number) ?? 0) + 1);
      return {
        slotId: slot.id,
        label: slot.label,
        choices: [...grouped.entries()].map(([variantId, qty]) => {
          const option = slot.options.find((o) => o.variantId === variantId)!;
          return { variantId, itemName: option.itemName, variantName: option.variantName, quantity: qty };
        }),
      };
    });
    addLine({
      menuItemId: item.id,
      variantId: variant.id,
      kind: "deal",
      name: item.name,
      variantName: variant.name,
      unitPrice: variant.price,
      quantity,
      note: note.trim() || null,
      dealChoices,
    });
    onOpenChange(false);
  };

  const backOnSale = () => {
    onOpenChange(false);
    startTransition(async () => {
      onAvailabilityChange(item.id, true); // optimistic; reverts by itself if the action fails
      const result = await callAction(toggleItemAvailabilityAction(item.id, true));
      if (!result.ok) toast.error(result.error);
      else toast.success(`${item.name} is back on sale`);
    });
  };

  const footer = !item.isAvailable ? (
    <Button size="lg" variant="outline" className="w-full" isLoading={isPending} startIcon={<RotateCcw className="h-5 w-5" />} onClick={backOnSale}>
      Back on sale
    </Button>
  ) : slots.length === 0 ? undefined : (
    <Button size="lg" className="w-full" onClick={handleAdd} disabled={missing > 0}>
      {missing > 0 ? `Pick ${missing} more` : `Add ${quantity > 1 ? `${quantity} ` : ""}· ${formatMoney(variant.price * quantity)}`}
    </Button>
  );

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={item.name} description={item.description ?? undefined} footer={footer}>
      <div className="space-y-5">
        {!item.isAvailable && (
          <Banner tone="danger">
            Marked sold out. It cannot be added to orders until it is back on sale.
          </Banner>
        )}
        {item.isAvailable && slots.length === 0 && (
          <Banner tone="warning">
            This deal has no items configured yet. An admin needs to add its slots under Menu.
          </Banner>
        )}

        {item.isAvailable &&
          slots.map((slot) => {
            const fixed = slot.options.length === 1;
            const units = picks[slot.id] ?? [];
            return (
              <div key={slot.id} className="space-y-2">
                <span className="block text-sm font-medium">
                  {slot.quantity} × {slot.label}
                </span>
                {fixed ? (
                  <p className="rounded-field bg-surface-2 px-4 py-3 text-sm">
                    {optionLabel(slot.options[0])}
                    {!slot.options[0].isAvailable && <span className="text-danger"> · sold out</span>}
                  </p>
                ) : (
                  units.map((value, index) => (
                    <div key={index} className={cn(slot.quantity > 1 && "rounded-field border border-border px-3 pb-1 pt-2")}>
                      {slot.quantity > 1 && (
                        <span className="block text-xs font-medium text-muted">
                          {slot.label} {index + 1}
                          {index > 0 && value !== NONE && value === units[0] && " · same as 1"}
                        </span>
                      )}
                      <Chips
                        aria-label={`${slot.label} ${index + 1}`}
                        wrap
                        value={value === NONE ? NONE : String(value)}
                        onChange={(v) => setPick(slot.id, index, Number(v))}
                        options={slot.options.map((o) => ({
                          value: String(o.variantId),
                          label: optionLabel(o),
                          hint: o.isAvailable ? undefined : "sold out",
                          disabled: !o.isAvailable,
                        }))}
                      />
                    </div>
                  ))
                )}
              </div>
            );
          })}

        {item.isAvailable && slots.length > 0 && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Quantity</span>
              <NumberStepper value={quantity} min={1} max={20} onChange={setQuantity} />
            </div>

            <Input
              label="Note for the kitchen (optional)"
              placeholder="e.g. extra spicy"
              autoComplete="off"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </>
        )}
      </div>
    </BottomSheet>
  );
}
