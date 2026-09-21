"use client";

import { useRef, useState, useTransition } from "react";
import { MessageSquarePlus, Percent, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { placeOrderAction } from "@/app/(app)/pos/actions";
import BottomSheet from "@/components/common/BottomSheet";
import Button from "@/components/common/Button";
import Chips from "@/components/common/Chips";
import ConfirmSheet from "@/components/common/ConfirmSheet";
import Input from "@/components/common/Input";
import NumberStepper from "@/components/common/NumberStepper";
import type { OrderType, PaymentMethod } from "@/db/schema/orders";
import type { UserRole } from "@/db/schema/users";
import type { PlaceOrderInput, PlaceOrderResult } from "@/server/orders/service";
import { callAction } from "@/utils/call-action";
import { cn } from "@/utils/cn";
import { formatMoney, roundMoney } from "@/utils/helper";
import { validateAndSetErrors } from "@/utils/validation";
import { cartTotals, useCart, type CartLine } from "../cart-store";
import { placeOrderSchema } from "../schema";
import type { PosSettings } from "..";

interface CartSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: PosSettings;
  role: UserRole;
  /** Runs inside the same tap (auto-print needs the activation window) after the sheet closes. */
  onPlaced: (result: PlaceOrderResult) => Promise<void>;
}

type PayChoice = PaymentMethod | "cod";

const ORDER_TYPES: { value: OrderType; label: string }[] = [
  { value: "takeaway", label: "Takeaway" },
  { value: "dine_in", label: "Dine-in" },
  { value: "delivery", label: "Delivery" },
];

const PLACE_OFFLINE = "No connection. Tap Place order again once online — the same cart is never charged twice.";

export default function CartSheet({ open, onOpenChange, settings, role, onPlaced }: CartSheetProps) {
  const cart = useCart();
  const [discountText, setDiscountText] = useState(cart.discountAmount ? String(cart.discountAmount) : "");
  const [showDiscount, setShowDiscount] = useState(cart.discountAmount > 0);
  const [showNote, setShowNote] = useState(cart.note.trim() !== "");
  const [deliveryText, setDeliveryText] = useState(
    cart.deliveryCharge === null ? String(settings.defaultDeliveryCharge) : String(cart.deliveryCharge)
  );
  const [confirmClear, setConfirmClear] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const deliveryRef = useRef<HTMLDivElement>(null);

  const totals = cartTotals(cart, settings.defaultDeliveryCharge);
  const isDelivery = cart.orderType === "delivery";
  const payChoice: PayChoice = cart.paymentMethod ?? "cod";
  const staffCap = role === "staff" ? roundMoney((totals.subtotal * settings.staffMaxDiscountPct) / 100) : null;

  // Live discount check so the cashier sees the limit before tapping Place.
  const discountError =
    cart.discountAmount > totals.subtotal
      ? "More than the subtotal"
      : staffCap !== null && cart.discountAmount > staffCap
        ? settings.staffMaxDiscountPct === 0
          ? "Only an admin can give discounts"
          : `Over your limit of Rs ${staffCap} (${settings.staffMaxDiscountPct}%)`
        : null;
  const discountNotNumber = discountText.trim() !== "" && !Number.isFinite(Number(discountText));
  const blockReason = discountNotNumber ? "Discount must be a number" : discountError;
  const canPlace = cart.lines.length > 0 && blockReason === null;

  const clearError = (field: string) => {
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const applyDiscount = (amount: number) => {
    const value = Math.min(roundMoney(amount), totals.subtotal);
    setDiscountText(value ? String(value) : "");
    cart.setDiscount(value);
    clearError("discountAmount");
  };

  const handleClear = () => {
    cart.clear();
    setConfirmClear(false);
    onOpenChange(false);
  };

  const scrollToDelivery =() => deliveryRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });

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
      toast.error("Add the customer's phone number");
      scrollToDelivery();
      return;
    }

    startTransition(async () => {
      const result = await callAction(placeOrderAction(input), { offline: PLACE_OFFLINE });
      if (!result.ok) {
        if (result.fieldErrors) setErrors(result.fieldErrors);
        // The server reports a missing/hidden variant by id; the cart knows its name.
        const badId = result.fieldErrors?.lines;
        const badLine = badId ? cart.lines.find((l) => String(l.variantId) === badId) : undefined;
        toast.error(badLine ? `${badLine.name} is no longer on the menu. Remove it from the cart.` : result.error);
        if (result.fieldErrors?.customerPhone) scrollToDelivery();
        return;
      }
      cart.clear();
      onOpenChange(false);
      await onPlaced(result.data);
    });
  };

  return (
    <>
    <BottomSheet
      open={open && !confirmClear}
      onOpenChange={onOpenChange}
      title="Cart"
      description={`${totals.count} item${totals.count === 1 ? "" : "s"}`}
      footer={
        <div className="space-y-2">
          {/* The discount field can be scrolled out of view; say why Place is greyed out here. */}
          {blockReason !== null && cart.lines.length > 0 && (
            <p role="alert" className="text-center text-xs text-danger">
              {blockReason}
            </p>
          )}
          <Button size="lg" className="w-full" isLoading={isPending} disabled={!canPlace} onClick={handlePlace}>
            Place order · {formatMoney(totals.total)}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {cart.lines.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">The cart is empty.</p>
        ) : (
          <div className="space-y-1">
            <ul className="divide-y divide-border rounded-field border border-border">
              {cart.lines.map((line) => (
                <CartRow
                  key={line.key}
                  line={line}
                  onQuantity={(q) => cart.setQuantity(line.key, q)}
                  onNote={(note) => cart.setLineNote(line.key, note)}
                  onRemove={() => cart.removeLine(line.key)}
                />
              ))}
            </ul>
            <div className="flex justify-end">
              <Button size="sm" variant="ghost" className="text-danger" startIcon={<Trash2 className="h-4 w-4" />} onClick={() => setConfirmClear(true)}>
                Clear cart
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-1">
          <span className="block text-sm font-medium">Order type</span>
          <Chips<OrderType>
            aria-label="Order type"
            value={cart.orderType}
            onChange={(t) => {
              cart.setOrderType(t);
              clearError("paymentMethod");
            }}
            options={ORDER_TYPES}
          />
        </div>

        {isDelivery && (
          <div ref={deliveryRef} className="space-y-3 rounded-field border border-border p-3">
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
              label="Address"
              placeholder="Street, block, landmark"
              autoComplete="off"
              maxLength={200}
              value={cart.deliveryAddress}
              onChange={(e) => {
                cart.setCustomer({ deliveryAddress: e.target.value });
                clearError("deliveryAddress");
              }}
              error={errors.deliveryAddress}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Name (optional)"
                autoComplete="off"
                autoCapitalize="words"
                maxLength={60}
                value={cart.customerName}
                onChange={(e) => {
                  cart.setCustomer({ customerName: e.target.value });
                  clearError("customerName");
                }}
                error={errors.customerName}
              />
              <Input
                label="Delivery (Rs)"
                inputMode="decimal"
                // Left blank, the shop's default charge applies.
                placeholder={String(settings.defaultDeliveryCharge)}
                value={deliveryText}
                onChange={(e) => {
                  setDeliveryText(e.target.value);
                  const n = Number(e.target.value);
                  cart.setDeliveryCharge(e.target.value.trim() === "" ? null : Number.isFinite(n) ? n : null);
                  clearError("deliveryCharge");
                }}
                error={errors.deliveryCharge}
              />
            </div>
          </div>
        )}

        <div className="space-y-1">
          <span className="block text-sm font-medium">Payment</span>
          <Chips<PayChoice>
            aria-label="Payment"
            value={payChoice}
            onChange={(v) => {
              cart.setPaymentMethod(v === "cod" ? null : v);
              clearError("paymentMethod");
            }}
            options={[
              ...(isDelivery ? [{ value: "cod" as const, label: "Pay on delivery" }] : []),
              { value: "cash", label: "Cash" },
              { value: "online", label: "Online / transfer" },
            ]}
          />
          {errors.paymentMethod && <p className="text-xs text-danger">{errors.paymentMethod}</p>}
          {isDelivery && payChoice === "cod" && (
            <p className="text-xs text-muted">Stays “pending” until you mark it paid when the rider returns.</p>
          )}
        </div>

        {(!showDiscount || !showNote) && (
          <div className="flex flex-wrap gap-2">
            {!showDiscount && (
              <Button size="sm" variant="outline" startIcon={<Percent className="h-4 w-4" />} onClick={() => setShowDiscount(true)}>
                Discount
              </Button>
            )}
            {!showNote && (
              <Button size="sm" variant="outline" startIcon={<MessageSquarePlus className="h-4 w-4" />} onClick={() => setShowNote(true)}>
                Order note
              </Button>
            )}
          </div>
        )}

        {showDiscount && (
          <div className="space-y-2">
            <Input
              label="Discount (Rs)"
              inputMode="decimal"
              placeholder="0"
              autoFocus={cart.discountAmount === 0}
              value={discountText}
              onChange={(e) => {
                setDiscountText(e.target.value);
                const n = Number(e.target.value);
                cart.setDiscount(Number.isFinite(n) ? n : 0);
                clearError("discountAmount");
              }}
              error={blockReason ?? errors.discountAmount}
              hint={staffCap !== null && settings.staffMaxDiscountPct > 0 ? `Up to Rs ${staffCap} (${settings.staffMaxDiscountPct}%) without an admin` : undefined}
            />
            <div className="flex flex-wrap gap-2">
              {[5, 10].map((pct) => (
                <QuickChip key={pct} onClick={() => applyDiscount((totals.subtotal * pct) / 100)}>
                  {pct}%
                </QuickChip>
              ))}
              <QuickChip onClick={() => applyDiscount(50)}>Rs 50</QuickChip>
              {cart.discountAmount > 0 && <QuickChip onClick={() => applyDiscount(0)}>None</QuickChip>}
            </div>
          </div>
        )}

        {showNote && (
          <Input
            label="Order note"
            placeholder="e.g. call on arrival"
            autoComplete="off"
            autoFocus={cart.note === ""}
            maxLength={200}
            value={cart.note}
            onChange={(e) => {
              cart.setNote(e.target.value);
              clearError("note");
            }}
            error={errors.note}
          />
        )}

        <dl className="space-y-1 rounded-field bg-surface-2 px-4 py-3 text-sm">
          <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd className="tabular-nums">{formatMoney(totals.subtotal)}</dd></div>
          {totals.discount > 0 && <div className="flex justify-between"><dt className="text-muted">Discount</dt><dd className="tabular-nums">− {formatMoney(totals.discount)}</dd></div>}
          {isDelivery && <div className="flex justify-between"><dt className="text-muted">Delivery</dt><dd className="tabular-nums">{formatMoney(totals.delivery)}</dd></div>}
          <div className="flex justify-between border-t border-border pt-1 text-base font-bold"><dt>Total</dt><dd className="tabular-nums">{formatMoney(totals.total)}</dd></div>
        </dl>
      </div>
    </BottomSheet>

    <ConfirmSheet
      open={open && confirmClear}
      onOpenChange={setConfirmClear}
      title="Clear the cart?"
      description={`${totals.count} item${totals.count === 1 ? "" : "s"} will be removed. This cannot be undone.`}
      confirmLabel="Clear cart"
      destructive
      onConfirm={handleClear}
    />
    </>
  );
}

function QuickChip({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-11 rounded-full border border-border bg-surface px-4 text-sm font-medium transition-colors active:bg-surface-2"
    >
      {children}
    </button>
  );
}

function CartRow({
  line,
  onQuantity,
  onNote,
  onRemove,
}: {
  line: CartLine;
  onQuantity: (q: number) => void;
  onNote: (note: string) => void;
  onRemove: () => void;
}) {
  const [editingNote, setEditingNote] = useState(false);
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
          {line.quantity > 1 && <p className="text-xs text-muted tabular-nums">{formatMoney(line.unitPrice)} each</p>}
          {line.note && !editingNote && <p className="text-xs italic text-muted">“{line.note}”</p>}
        </div>
        <p className={cn("shrink-0 font-semibold tabular-nums")}>{formatMoney(line.unitPrice * line.quantity)}</p>
      </div>
      {editingNote && (
        <Input
          placeholder="Note for the kitchen"
          aria-label={`Note for ${line.name}`}
          maxLength={120}
          autoComplete="off"
          autoFocus
          className="h-10 text-sm"
          defaultValue={line.note ?? ""}
          onBlur={(e) => {
            onNote(e.target.value);
            setEditingNote(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
        />
      )}
      <div className="flex items-center justify-between">
        <NumberStepper value={line.quantity} min={0} max={99} removeAtOne aria-label={`${line.name} quantity`} onChange={onQuantity} />
        <div className="flex items-center">
          <Button size="sm" variant="ghost" className="text-muted" aria-label={`${line.note ? "Edit note for" : "Add note to"} ${line.name}`} onClick={() => setEditingNote(true)}>
            <MessageSquarePlus className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" className="text-danger" aria-label={`Remove ${line.name}`} onClick={onRemove}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </li>
  );
}
