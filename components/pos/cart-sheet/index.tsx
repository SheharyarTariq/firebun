"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { placeOrderAction } from "@/app/(app)/pos/actions";
import BottomSheet from "@/components/common/BottomSheet";
import Button from "@/components/common/Button";
import Chips from "@/components/common/Chips";
import Input from "@/components/common/Input";
import NumberStepper from "@/components/common/NumberStepper";
import { usePrinter } from "@/components/printing/use-printer";
import type { OrderType, PaymentMethod } from "@/db/schema/orders";
import type { UserRole } from "@/db/schema/users";
import type { PlaceOrderInput } from "@/server/orders/service";
import { cn } from "@/utils/cn";
import { formatMoney, formatOrderNumber } from "@/utils/helper";
import { routes } from "@/utils/routes";
import { validateAndSetErrors } from "@/utils/validation";
import { cartTotals, useCart, type CartLine } from "../cart-store";
import { placeOrderSchema } from "../schema";
import type { PosSettings } from "..";

interface CartSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: PosSettings;
  role: UserRole;
}

type PayChoice = PaymentMethod | "cod";

const ORDER_TYPES: { value: OrderType; label: string }[] = [
  { value: "takeaway", label: "Takeaway" },
  { value: "dine_in", label: "Dine-in" },
  { value: "delivery", label: "Delivery" },
];

export default function CartSheet({ open, onOpenChange, settings, role }: CartSheetProps) {
  const router = useRouter();
  const cart = useCart();
  const printer = usePrinter();
  const [discountText, setDiscountText] = useState(cart.discountAmount ? String(cart.discountAmount) : "");
  const [deliveryText, setDeliveryText] = useState(
    cart.deliveryCharge === null ? String(settings.defaultDeliveryCharge) : String(cart.deliveryCharge)
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  const totals = cartTotals(cart, settings.defaultDeliveryCharge);
  const isDelivery = cart.orderType === "delivery";
  const payChoice: PayChoice = cart.paymentMethod ?? "cod";
  const staffCap = role === "staff" ? Math.floor((totals.subtotal * settings.staffMaxDiscountPct) / 100) : null;

  const clearError = (field: string) => {
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handlePlace = async () => {
    const input: PlaceOrderInput = {
      clientId: cart.clientId,
      orderType: cart.orderType,
      lines: cart.lines.map((l) => ({
        variantId: l.variantId,
        quantity: l.quantity,
        note: l.note,
        dealChoices: l.kind === "deal" ? l.dealChoices.map((s) => ({ slotId: s.slotId, choices: s.choices.map((c) => ({ variantId: c.variantId, quantity: c.quantity })) })) : undefined,
      })),
      discountAmount: cart.discountAmount,
      deliveryCharge: isDelivery ? cart.deliveryCharge : null,
      customerName: cart.customerName || null,
      customerPhone: cart.customerPhone || null,
      deliveryAddress: cart.deliveryAddress || null,
      note: cart.note || null,
      paymentMethod: isDelivery ? cart.paymentMethod : (cart.paymentMethod ?? "cash"),
    };
    if (!(await validateAndSetErrors(placeOrderSchema, input, setErrors))) {
      toast.error("Check the highlighted fields");
      return;
    }
    if (isDelivery && !input.customerPhone) {
      setErrors({ customerPhone: "Needed for delivery" });
      return;
    }

    startTransition(async () => {
      const result = await placeOrderAction(input);
      if (!result.ok) {
        if (result.fieldErrors) setErrors(result.fieldErrors);
        toast.error(result.error);
        return;
      }
      const { dailySeq, total, warnings, orderId, duplicate } = result.data;
      toast.success(duplicate ? `Order ${formatOrderNumber(dailySeq)} was already placed` : `Order ${formatOrderNumber(dailySeq)} placed · ${formatMoney(total)}`, { duration: 4000 });
      for (const w of warnings) toast(w, { icon: "⚠️", duration: 6000 });
      cart.clear();
      onOpenChange(false);
      // Still inside the tap's activation window, so Bluetooth / RawBT are allowed to print.
      if (settings.autoPrintOnPlace && printer.isConfigured && !duplicate) {
        await printer.print(orderId, { kitchenCopy: settings.printKitchenCopy });
      }
      router.push(routes.ui.orderDetails(orderId));
    });
  };

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Cart"
      description={`${totals.count} item${totals.count === 1 ? "" : "s"}`}
      footer={
        <Button size="lg" className="w-full" isLoading={isPending} disabled={cart.lines.length === 0} onClick={handlePlace}>
          Place order · {formatMoney(totals.total)}
        </Button>
      }
    >
      <div className="space-y-5">
        {cart.lines.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">The cart is empty.</p>
        ) : (
          <ul className="divide-y divide-border rounded-field border border-border">
            {cart.lines.map((line) => (
              <CartRow key={line.key} line={line} onQuantity={(q) => cart.setQuantity(line.key, q)} onRemove={() => cart.removeLine(line.key)} />
            ))}
          </ul>
        )}

        <div className="space-y-2">
          <span className="block text-sm font-medium">Order type</span>
          <Chips<OrderType> value={cart.orderType} onChange={cart.setOrderType} options={ORDER_TYPES} />
        </div>

        {isDelivery && (
          <div className="space-y-3 rounded-field border border-border p-3">
            <Input
              label="Customer phone"
              type="tel"
              inputMode="tel"
              placeholder="03xx xxxxxxx"
              autoComplete="off"
              value={cart.customerPhone}
              onChange={(e) => {
                cart.setCustomer({ customerPhone: e.target.value });
                clearError("customerPhone");
              }}
              error={errors.customerPhone}
            />
            <Input
              label="Customer name (optional)"
              autoComplete="off"
              value={cart.customerName}
              onChange={(e) => cart.setCustomer({ customerName: e.target.value })}
            />
            <Input
              label="Address"
              placeholder="Street, block, landmark"
              autoComplete="off"
              value={cart.deliveryAddress}
              onChange={(e) => cart.setCustomer({ deliveryAddress: e.target.value })}
            />
            <Input
              label="Delivery charge (Rs)"
              inputMode="decimal"
              value={deliveryText}
              onChange={(e) => {
                setDeliveryText(e.target.value);
                const n = Number(e.target.value);
                cart.setDeliveryCharge(e.target.value.trim() === "" ? null : Number.isFinite(n) ? n : null);
                clearError("deliveryCharge");
              }}
              error={errors.deliveryCharge}
              hint={`Default Rs ${settings.defaultDeliveryCharge}`}
            />
          </div>
        )}

        <Input
          label="Discount (Rs)"
          inputMode="decimal"
          placeholder="0"
          value={discountText}
          onChange={(e) => {
            setDiscountText(e.target.value);
            const n = Number(e.target.value);
            cart.setDiscount(Number.isFinite(n) ? n : 0);
            clearError("discountAmount");
          }}
          error={errors.discountAmount}
          hint={staffCap !== null ? (settings.staffMaxDiscountPct === 0 ? "Only an admin can give discounts" : `You can give up to Rs ${staffCap} (${settings.staffMaxDiscountPct}%)`) : undefined}
        />

        <div className="space-y-2">
          <span className="block text-sm font-medium">Payment</span>
          <Chips<PayChoice>
            value={payChoice}
            onChange={(v) => {
              cart.setPaymentMethod(v === "cod" ? null : v);
              clearError("paymentMethod");
            }}
            options={[
              { value: "cash", label: "Cash" },
              { value: "online", label: "Online / transfer" },
              ...(isDelivery ? [{ value: "cod" as const, label: "Pay on delivery" }] : []),
            ]}
          />
          {errors.paymentMethod && <p className="text-xs text-danger">{errors.paymentMethod}</p>}
          {isDelivery && payChoice === "cod" && (
            <p className="text-xs text-muted">The order stays “pending” until you mark it paid when the rider returns.</p>
          )}
        </div>

        <Input
          label="Order note (optional)"
          placeholder="e.g. call on arrival"
          autoComplete="off"
          value={cart.note}
          onChange={(e) => cart.setNote(e.target.value)}
        />

        <dl className="space-y-1 rounded-field bg-surface-2 px-4 py-3 text-sm">
          <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd className="tabular-nums">{formatMoney(totals.subtotal)}</dd></div>
          {totals.discount > 0 && <div className="flex justify-between"><dt className="text-muted">Discount</dt><dd className="tabular-nums">− {formatMoney(totals.discount)}</dd></div>}
          {isDelivery && <div className="flex justify-between"><dt className="text-muted">Delivery</dt><dd className="tabular-nums">{formatMoney(totals.delivery)}</dd></div>}
          <div className="flex justify-between border-t border-border pt-1 text-base font-bold"><dt>Total</dt><dd className="tabular-nums">{formatMoney(totals.total)}</dd></div>
        </dl>
      </div>
    </BottomSheet>
  );
}

function CartRow({ line, onQuantity, onRemove }: { line: CartLine; onQuantity: (q: number) => void; onRemove: () => void }) {
  return (
    <li className="space-y-2 px-3 py-3">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium">
            {line.name}
            {line.variantName !== "Regular" && <span className="text-muted"> · {line.variantName}</span>}
          </p>
          {line.dealChoices.map((slot) => (
            <p key={slot.slotId} className="text-xs text-muted">
              {slot.choices.map((c) => `${c.quantity > 1 ? `${c.quantity} × ` : ""}${c.itemName}${c.variantName !== "Regular" ? ` (${c.variantName})` : ""}`).join(", ")}
            </p>
          ))}
          {line.note && <p className="text-xs italic text-muted">“{line.note}”</p>}
        </div>
        <p className={cn("shrink-0 font-semibold tabular-nums")}>{formatMoney(line.unitPrice * line.quantity)}</p>
      </div>
      <div className="flex items-center justify-between">
        <NumberStepper size="sm" value={line.quantity} min={0} max={99} onChange={onQuantity} />
        <Button size="sm" variant="ghost" className="text-danger" startIcon={<Trash2 className="h-4 w-4" />} onClick={onRemove}>
          Remove
        </Button>
      </div>
    </li>
  );
}
