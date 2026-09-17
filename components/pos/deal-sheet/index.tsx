"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import BottomSheet from "@/components/common/BottomSheet";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import NumberStepper from "@/components/common/NumberStepper";
import Select from "@/components/common/Select";
import type { CatalogItem, CatalogSlot } from "@/server/orders/queries";
import { formatMoney } from "@/utils/helper";
import { useCart, type CartSlotChoice } from "../cart-store";

interface DealSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: CatalogItem;
}

/** One select per unit in each slot ("Pizza 1", "Pizza 2"), fixed slots need no input. */
function initialPicks(slots: CatalogSlot[]): Record<number, (number | "")[]> {
  const picks: Record<number, (number | "")[]> = {};
  for (const slot of slots) {
    const available = slot.options.filter((o) => o.isAvailable);
    const fixed = slot.options.length === 1 ? slot.options[0].variantId : available.length === 1 ? available[0].variantId : "";
    picks[slot.id] = Array.from({ length: slot.quantity }, () => fixed);
  }
  return picks;
}

export default function DealSheet({ open, onOpenChange, item }: DealSheetProps) {
  const addLine = useCart((s) => s.addLine);
  const variant = item?.variants[0];
  const slots = variant?.slots ?? [];
  const [picks, setPicks] = useState<Record<number, (number | "")[]>>(() => initialPicks(slots));
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!item || !variant) return null;

  const setPick = (slotId: number, index: number, value: number | "") => {
    setPicks((prev) => ({ ...prev, [slotId]: prev[slotId].map((v, i) => (i === index ? value : v)) }));
    setError(null);
  };

  const handleAdd = () => {
    const dealChoices: CartSlotChoice[] = [];
    for (const slot of slots) {
      const chosen = picks[slot.id] ?? [];
      if (chosen.some((v) => v === "")) {
        setError(`Pick ${slot.quantity === 1 ? "the" : "all"} ${slot.label}${slot.quantity > 1 ? "s" : ""}.`);
        return;
      }
      const grouped = new Map<number, number>();
      for (const v of chosen) grouped.set(v as number, (grouped.get(v as number) ?? 0) + 1);
      dealChoices.push({
        slotId: slot.id,
        label: slot.label,
        choices: [...grouped.entries()].map(([variantId, qty]) => {
          const option = slot.options.find((o) => o.variantId === variantId)!;
          return { variantId, itemName: option.itemName, variantName: option.variantName, quantity: qty };
        }),
      });
    }
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
    toast.success(`${quantity} × ${item.name} added`);
    onOpenChange(false);
  };

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={item.name}
      description={item.description ?? undefined}
      footer={
        item.isAvailable ? (
          <Button size="lg" className="w-full" onClick={handleAdd} disabled={slots.length === 0}>
            Add · {formatMoney(variant.price * quantity)}
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-5">
        {!item.isAvailable && (
          <p className="rounded-field bg-danger-bg px-4 py-3 text-sm text-danger">This deal is marked sold out.</p>
        )}
        {slots.length === 0 && (
          <p className="rounded-field bg-warning-bg px-4 py-3 text-sm text-warning">
            This deal has no items configured yet. An admin needs to add its slots under Menu.
          </p>
        )}

        {slots.map((slot) => {
          const fixed = slot.options.length === 1;
          return (
            <div key={slot.id} className="space-y-2">
              <span className="block text-sm font-medium">
                {slot.quantity} × {slot.label}
              </span>
              {fixed ? (
                <p className="rounded-field bg-surface-2 px-4 py-3 text-sm">
                  {slot.options[0].itemName}
                  {slot.options[0].variantName !== "Regular" && ` · ${slot.options[0].variantName}`}
                  {!slot.options[0].isAvailable && <span className="text-danger"> (sold out)</span>}
                </p>
              ) : (
                <div className="space-y-2">
                  {(picks[slot.id] ?? []).map((value, index) => (
                    <Select
                      key={index}
                      aria-label={`${slot.label} ${index + 1}`}
                      placeholder={slot.quantity > 1 ? `${slot.label} ${index + 1}` : `Choose ${slot.label}`}
                      value={value === "" ? "" : String(value)}
                      onChange={(e) => setPick(slot.id, index, e.target.value === "" ? "" : Number(e.target.value))}
                      options={slot.options.map((o) => ({
                        value: String(o.variantId),
                        label: `${o.itemName}${o.variantName !== "Regular" ? ` · ${o.variantName}` : ""}${o.isAvailable ? "" : " (sold out)"}`,
                        disabled: !o.isAvailable,
                      }))}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {error && <p className="text-sm text-danger">{error}</p>}

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
      </div>
    </BottomSheet>
  );
}
