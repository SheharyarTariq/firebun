"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { updateOrderItemsAction } from "@/app/(app)/orders/actions";
import Badge from "@/components/common/Badge";
import BottomSheet from "@/components/common/BottomSheet";
import Button from "@/components/common/Button";
import Card from "@/components/common/Card";
import ConfirmSheet from "@/components/common/ConfirmSheet";
import Input from "@/components/common/Input";
import ListRow from "@/components/common/ListRow";
import NumberStepper from "@/components/common/NumberStepper";
import SectionHeading from "@/components/common/SectionHeading";
import Toggle from "@/components/common/Toggle";
import type { CatalogCategory } from "@/server/orders/queries";
import type { OrderDetails } from "@/server/orders/queries";
import { callAction } from "@/utils/call-action";
import { formatMoney } from "@/utils/helper";

interface EditOrderSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: OrderDetails;
  catalog: CatalogCategory[];
  /** Asked after saving, because the customer is holding the old slip. */
  onSaved: () => void;
}

/** One editable line. Deal children are not editable individually — see the note below. */
interface EditLine {
  key: string;
  variantId: number;
  name: string;
  variantName: string;
  unitPrice: number;
  quantity: number;
  note: string | null;
  /** Rebuilt from the order so a deal keeps the choices it was placed with. */
  dealChoices: { slotId: number; choices: { variantId: number; quantity: number }[] }[];
  isDeal: boolean;
}

export default function EditOrderSheet({ open, onOpenChange, order, catalog, onSaved }: EditOrderSheetProps) {
  const router = useRouter();
  const [lines, setLines] = useState<EditLine[]>(() => {
    const parents = order.items.filter((i) => i.parentOrderItemId === null);
    return parents.map((p) => {
      const kids = order.items.filter((i) => i.parentOrderItemId === p.id);
      const bySlot = new Map<number, { variantId: number; quantity: number }[]>();
      for (const k of kids) {
        if (k.dealSlotId === null || k.variantId === null) continue;
        bySlot.set(k.dealSlotId, [
          ...(bySlot.get(k.dealSlotId) ?? []),
          { variantId: k.variantId, quantity: Math.max(1, Math.round(k.quantity / p.quantity)) },
        ]);
      }
      return {
        key: `line-${p.id}`,
        variantId: p.variantId ?? 0,
        name: p.nameSnapshot,
        variantName: p.variantNameSnapshot,
        unitPrice: p.unitPriceSnapshot,
        quantity: p.quantity,
        note: p.note,
        dealChoices: [...bySlot.entries()].map(([slotId, choices]) => ({ slotId, choices })),
        isDeal: kids.length > 0,
      };
    });
  });
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [alreadyMade, setAlreadyMade] = useState(false);
  const [isPending, startTransition] = useTransition();

  const subtotal = lines.reduce((n, l) => n + l.unitPrice * l.quantity, 0);
  const total = subtotal - order.discountAmount + order.deliveryCharge;
  const difference = total - order.total;

  /** Whether anything came off, which is the only case where "already made" matters. */
  const removedSomething = useMemo(() => {
    const before = new Map<number, number>();
    for (const i of order.items.filter((x) => x.parentOrderItemId === null)) {
      before.set(i.variantId ?? 0, (before.get(i.variantId ?? 0) ?? 0) + i.quantity);
    }
    for (const l of lines) before.set(l.variantId, (before.get(l.variantId) ?? 0) - l.quantity);
    return [...before.values()].some((n) => n > 0);
  }, [lines, order.items]);

  const setQuantity = (key: string, quantity: number) =>
    setLines((prev) =>
      quantity <= 0 ? prev.filter((l) => l.key !== key) : prev.map((l) => (l.key === key ? { ...l, quantity } : l))
    );

  const addItem = (variantId: number, name: string, variantName: string, price: number) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.variantId === variantId && !l.isDeal);
      if (existing) {
        return prev.map((l) => (l.key === existing.key ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [
        ...prev,
        {
          key: `new-${variantId}-${Date.now()}`,
          variantId,
          name,
          variantName,
          unitPrice: price,
          quantity: 1,
          note: null,
          dealChoices: [],
          isDeal: false,
        },
      ];
    });
    setAdding(false);
    setSearch("");
  };

  const handleSave = () => {
    startTransition(async () => {
      const result = await callAction(
        updateOrderItemsAction(order.id, {
          lines: lines.map((l) => ({
            variantId: l.variantId,
            quantity: l.quantity,
            note: l.note,
            dealChoices: l.isDeal ? l.dealChoices : undefined,
          })),
          discountAmount: order.discountAmount,
          deliveryCharge: order.orderType === "delivery" ? order.deliveryCharge : null,
          alreadyMade: removedSomething && alreadyMade,
        })
      );
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setConfirming(false);
      onOpenChange(false);
      toast.success(
        result.data.difference === 0
          ? "Order updated"
          : result.data.difference > 0
            ? `Order updated — collect ${formatMoney(result.data.difference)} more`
            : `Order updated — refund ${formatMoney(Math.abs(result.data.difference))}`
      );
      for (const warning of result.data.warnings) toast(warning, { icon: "⚠️" });
      router.refresh();
      onSaved();
    });
  };

  // Single items only: a deal is added from the counter, where its slots can be chosen properly.
  const options = catalog
    .flatMap((c) => c.items.map((item) => ({ ...item, categoryName: c.name })))
    .filter((item) => item.kind === "single" && item.isAvailable)
    .flatMap((item) =>
      item.variants.map((v) => ({
        variantId: v.id,
        variantName: v.name,
        price: v.price,
        itemName: item.name,
        categoryName: item.categoryName,
      }))
    )
    .filter((v) => {
      const text = search.trim().toLowerCase();
      return !text || v.itemName.toLowerCase().includes(text) || v.categoryName.toLowerCase().includes(text);
    });

  return (
    <>
      <ConfirmSheet
        open={confirming}
        onOpenChange={(next) => !next && setConfirming(false)}
        title={
          difference === 0
            ? "Save these changes?"
            : difference > 0
              ? `Collect ${formatMoney(difference)} more?`
              : `Refund ${formatMoney(Math.abs(difference))}?`
        }
        description={
          order.status === "completed" && difference !== 0
            ? `This order was already paid ${formatMoney(order.total)}. The new total is ${formatMoney(total)}.`
            : `The new total is ${formatMoney(total)}.`
        }
        confirmLabel="Save changes"
        isLoading={isPending}
        onConfirm={handleSave}
      >
        {removedSomething && (
          <Toggle
            label="This food was already made"
            description="Ingredients stay out of stock and are recorded as wastage instead of going back on the shelf."
            checked={alreadyMade}
            onChange={setAlreadyMade}
          />
        )}
      </ConfirmSheet>

      <BottomSheet
        open={adding}
        onOpenChange={setAdding}
        title="Add an item"
        description="Single items only — to change what is inside a deal, remove it and add it again from the counter."
      >
        <div className="space-y-3">
          <Input
            placeholder="Search the menu"
            autoComplete="off"
            data-autofocus="true"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            startIcon={<Search className="h-4 w-4" />}
          />
          <Card className="divide-y divide-border p-0">
            {options.slice(0, 40).map((v) => (
              <ListRow
                key={v.variantId}
                dense
                onClick={() => addItem(v.variantId, v.itemName, v.variantName, v.price)}
                trailing={<span className="text-sm font-semibold tabular-nums">{formatMoney(v.price)}</span>}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{v.itemName}</span>
                  {v.variantName !== "Regular" && <span className="block text-xs text-muted">{v.variantName}</span>}
                </span>
              </ListRow>
            ))}
          </Card>
        </div>
      </BottomSheet>

      <BottomSheet
        open={open && !adding && !confirming}
        onOpenChange={onOpenChange}
        title="Edit order"
        description="The order keeps its number, so the customer's slip stays valid. Print it again after saving."
        footer={
          <div className="flex gap-2">
            <Button variant="outline" size="lg" startIcon={<Plus className="h-4 w-4" />} onClick={() => setAdding(true)}>
              Add
            </Button>
            <Button
              size="lg"
              className="flex-1"
              disabled={lines.length === 0}
              onClick={() => setConfirming(true)}
            >
              Review · {formatMoney(total)}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <SectionHeading>Items</SectionHeading>
          <Card className="divide-y divide-border p-0">
            {lines.map((line) => (
              <div key={line.key} className="flex items-center gap-3 px-4 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {line.name}
                    {line.isDeal && (
                      <Badge className="ml-2" variant="brand">
                        Deal
                      </Badge>
                    )}
                  </span>
                  <span className="block text-xs text-muted">
                    {line.variantName !== "Regular" ? `${line.variantName} · ` : ""}
                    {formatMoney(line.unitPrice)} each
                  </span>
                </span>
                <NumberStepper
                  value={line.quantity}
                  min={0}
                  max={99}
                  onChange={(q) => setQuantity(line.key, q)}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove ${line.name}`}
                  className="text-danger"
                  onClick={() => setQuantity(line.key, 0)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </Card>

          {lines.length === 0 && (
            <p className="text-center text-sm text-muted">
              An order needs at least one item. Add something, or cancel the order instead.
            </p>
          )}

          <Card className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Subtotal</span>
              <span className="tabular-nums">{formatMoney(subtotal)}</span>
            </div>
            {order.discountAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted">Discount</span>
                <span className="tabular-nums">− {formatMoney(order.discountAmount)}</span>
              </div>
            )}
            {order.deliveryCharge > 0 && (
              <div className="flex justify-between">
                <span className="text-muted">Delivery</span>
                <span className="tabular-nums">{formatMoney(order.deliveryCharge)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-border pt-1 font-semibold">
              <span>Total</span>
              <span className="tabular-nums">{formatMoney(total)}</span>
            </div>
            {difference !== 0 && (
              <p className={`pt-1 text-xs ${difference > 0 ? "text-warning" : "text-success"}`}>
                {difference > 0
                  ? `${formatMoney(difference)} more than before`
                  : `${formatMoney(Math.abs(difference))} less than before`}
              </p>
            )}
          </Card>
        </div>
      </BottomSheet>
    </>
  );
}
