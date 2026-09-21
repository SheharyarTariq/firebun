"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ban, Phone, Plus, Printer, RotateCcw, Trash2, Wallet } from "lucide-react";
import toast from "react-hot-toast";
import { cancelOrderAction, deleteOrderAction, markOrderPaidAction } from "@/app/(app)/orders/actions";
import Badge from "@/components/common/Badge";
import BottomSheet from "@/components/common/BottomSheet";
import Button from "@/components/common/Button";
import Card from "@/components/common/Card";
import Chips from "@/components/common/Chips";
import ConfirmSheet from "@/components/common/ConfirmSheet";
import Input from "@/components/common/Input";
import Toggle from "@/components/common/Toggle";
import PageHeader from "@/components/layout/page-header";
import type { PaymentMethod } from "@/db/schema/orders";
import type { UserRole } from "@/db/schema/users";
import { useCart, useHydrated, type CartLine } from "@/components/pos/cart-store";
import PrinterSheet from "@/components/printing/printer-sheet";
import { usePrinter } from "@/components/printing/use-printer";
import type { OrderDetails as OrderDetailsData, OrderLine } from "@/server/orders/queries";
import { callAction } from "@/utils/call-action";
import { formatDateTime, formatMoney, formatOrderNumber } from "@/utils/helper";
import { routes } from "@/utils/routes";
import { validateAndSetErrors } from "@/utils/validation";
import { ORDER_TYPE_LABELS, PAYMENT_LABELS, STATUS_BADGE, STATUS_LABELS, lineLabel } from "../format";
import { cancelOrderSchema, markPaidSchema } from "../schema";

interface OrderDetailsProps {
  order: OrderDetailsData;
  viewer: { id: number; role: UserRole };
  /** Decided on the server (admin: always; staff: own order within the cancel window). */
  canCancel: boolean;
  /** Why Cancel is missing (staff outside the window, someone else's order); shown instead of the button. */
  cancelBlockedReason?: string | null;
  printKitchenCopy: boolean;
}

type Sheet = "paid" | "cancel" | "printer" | "repeat" | "delete" | null;

export default function OrderDetails({ order, viewer, canCancel, cancelBlockedReason, printKitchenCopy }: OrderDetailsProps) {
  const router = useRouter();
  const hydrated = useHydrated();
  const cartCount = useCart((s) => s.lines.length);
  const replaceLines = useCart((s) => s.replaceLines);
  const printer = usePrinter();
  const [sheet, setSheet] = useState<Sheet>(null);
  // No default: taking a payment is a decision, and "Cash" pre-picked hides a wrong tap.
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("");
  const [reason, setReason] = useState("");
  const [restock, setRestock] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  const parents = order.items.filter((i) => i.parentOrderItemId === null);
  const childrenOf = (parentId: number) => order.items.filter((i) => i.parentOrderItemId === parentId);
  // Test or mistaken orders: admins may remove them once cancelled.
  const canDelete = viewer.role === "admin" && order.status === "cancelled";

  const openCancel = () => {
    setReason("");
    setRestock(true);
    setErrors({});
    setSheet("cancel");
  };

  const handleDelete = () => {
    startTransition(async () => {
      const result = await callAction(deleteOrderAction(order.id));
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Order ${formatOrderNumber(order.dailySeq)} deleted`);
      router.push(routes.ui.orders);
    });
  };

  const handleMarkPaid = async () => {
    if (paymentMethod === "") return;
    if (!(await validateAndSetErrors(markPaidSchema, { paymentMethod }, setErrors))) return;
    startTransition(async () => {
      const result = await callAction(markOrderPaidAction(order.id, { paymentMethod }));
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Order ${formatOrderNumber(order.dailySeq)} marked paid`);
      setSheet(null);
    });
  };

  const handleCancel = async () => {
    if (!(await validateAndSetErrors(cancelOrderSchema, { reason, restock }, setErrors))) return;
    startTransition(async () => {
      const result = await callAction(cancelOrderAction(order.id, { reason, restock }));
      if (!result.ok) {
        if (result.fieldErrors) setErrors(result.fieldErrors);
        toast.error(result.error);
        return;
      }
      toast.success(`Order ${formatOrderNumber(order.dailySeq)} cancelled`);
      setSheet(null);
    });
  };

  const printBill = async () => {
    // No transport yet, or Bluetooth chosen but not paired in this session → set up first.
    if (!printer.canPrintNow()) {
      setSheet("printer");
      return;
    }
    const id = toast.loading("Printing bill…");
    const ok = await printer.print(order.id, { kitchenCopy: printKitchenCopy, quiet: true });
    if (ok) toast.success("Bill printed", { id });
    else toast.dismiss(id);
  };

  const repeatOrder = () => {
    const lines: Omit<CartLine, "key">[] = parents.map((p) => {
      const kids = childrenOf(p.id);
      const slots = new Map<number, OrderLine[]>();
      for (const k of kids) {
        if (k.dealSlotId === null) continue;
        slots.set(k.dealSlotId, [...(slots.get(k.dealSlotId) ?? []), k]);
      }
      return {
        menuItemId: p.menuItemId,
        variantId: p.variantId,
        kind: kids.length > 0 ? "deal" : "single",
        name: p.nameSnapshot,
        variantName: p.variantNameSnapshot,
        unitPrice: p.unitPriceSnapshot,
        quantity: p.quantity,
        note: p.note,
        dealChoices: [...slots.entries()].map(([slotId, rows]) => ({
          slotId,
          label: "",
          choices: rows.map((r) => ({
            variantId: r.variantId,
            itemName: r.nameSnapshot,
            variantName: r.variantNameSnapshot,
            quantity: Math.max(1, Math.round(r.quantity / p.quantity)),
          })),
        })),
      };
    });
    replaceLines(lines, {
      orderType: order.orderType,
      customerName: order.customerName ?? "",
      customerPhone: order.customerPhone ?? "",
      deliveryAddress: order.deliveryAddress ?? "",
    });
    setSheet(null);
    toast.success("Copied to a new cart — prices are checked again when you place it");
    router.push(routes.ui.pos);
  };

  const handleRepeat = () => {
    if (hydrated && cartCount > 0) setSheet("repeat");
    else repeatOrder();
  };

  return (
    <>
      <PageHeader
        title={`Order ${formatOrderNumber(order.dailySeq)}`}
        subtitle={`${ORDER_TYPE_LABELS[order.orderType]} · ${formatDateTime(order.createdAt)} · ${order.createdByUser.name}`}
        backHref={routes.ui.orders}
        actions={<Badge variant={STATUS_BADGE[order.status]}>{STATUS_LABELS[order.status]}</Badge>}
      />

      <div className="space-y-4 p-4 pb-28">
        {order.status === "cancelled" && (
          <Card className="space-y-1 border-danger/40 bg-danger-bg/40 text-sm">
            <p className="font-semibold text-danger">Cancelled{order.cancelledByUser ? ` by ${order.cancelledByUser.name}` : ""}</p>
            <p>{order.cancelReason}</p>
            <p className="text-xs text-muted">{order.restocked ? "Ingredients were returned to stock." : "Ingredients were not returned to stock."}</p>
          </Card>
        )}

        {order.status === "pending" && (
          <Button size="lg" className="w-full" startIcon={<Wallet className="h-5 w-5" />} onClick={() => setSheet("paid")}>
            Mark as paid · {formatMoney(order.total)}
          </Button>
        )}

        <Card className="p-0">
          <ul className="divide-y divide-border">
            {parents.map((line) => {
              const kids = childrenOf(line.id);
              return (
                <li key={line.id} className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    <span className="w-8 shrink-0 text-sm font-semibold tabular-nums text-muted">{line.quantity}×</span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{lineLabel(line.nameSnapshot, line.variantNameSnapshot)}</span>
                      {kids.map((k) => (
                        <span key={k.id} className="block text-xs text-muted">
                          {k.quantity}× {lineLabel(k.nameSnapshot, k.variantNameSnapshot)}
                        </span>
                      ))}
                      {line.note && <span className="block text-xs italic text-muted">“{line.note}”</span>}
                    </span>
                    <span className="shrink-0 font-semibold tabular-nums">{formatMoney(line.lineTotal)}</span>
                  </div>
                </li>
              );
            })}
          </ul>
          <dl className="space-y-1 border-t border-border px-4 py-3 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd className="tabular-nums">{formatMoney(order.subtotal)}</dd></div>
            {order.discountAmount > 0 && <div className="flex justify-between"><dt className="text-muted">Discount</dt><dd className="tabular-nums">− {formatMoney(order.discountAmount)}</dd></div>}
            {order.deliveryCharge > 0 && <div className="flex justify-between"><dt className="text-muted">Delivery</dt><dd className="tabular-nums">{formatMoney(order.deliveryCharge)}</dd></div>}
            <div className="flex justify-between border-t border-border pt-1 text-base font-bold"><dt>Total</dt><dd className="tabular-nums">{formatMoney(order.total)}</dd></div>
            <div className="flex justify-between text-xs text-muted">
              <dt>Payment</dt>
              <dd>{order.paymentMethod ? `${PAYMENT_LABELS[order.paymentMethod]}${order.paidAt ? ` · ${formatDateTime(order.paidAt)}` : ""}` : "Not paid yet"}</dd>
            </div>
          </dl>
        </Card>

        {(order.customerName || order.customerPhone || order.deliveryAddress || order.note) && (
          <Card className="space-y-1 text-sm">
            {order.customerName && <p className="font-medium">{order.customerName}</p>}
            {order.customerPhone && (
              <p>
                <a href={`tel:${order.customerPhone}`} className="-my-1 inline-flex min-h-11 items-center gap-2 font-medium underline">
                  <Phone aria-hidden className="h-4 w-4" />
                  {order.customerPhone}
                </a>
              </p>
            )}
            {order.deliveryAddress && <p className="text-muted">{order.deliveryAddress}</p>}
            {order.note && <p className="italic text-muted">“{order.note}”</p>}
          </Card>
        )}

        <div className="flex flex-col items-center gap-1">
          <Button variant="ghost" startIcon={<RotateCcw className="h-4 w-4" />} onClick={handleRepeat}>
            Repeat this order
          </Button>
          {canCancel && (
            <Button variant="ghost" className="text-danger" startIcon={<Ban className="h-4 w-4" />} onClick={openCancel}>
              Cancel order
            </Button>
          )}
          {!canCancel && cancelBlockedReason && order.status !== "cancelled" && (
            <p className="max-w-xs px-4 text-center text-xs text-muted">{cancelBlockedReason}</p>
          )}
          {canDelete && (
            <Button variant="ghost" className="text-danger" startIcon={<Trash2 className="h-4 w-4" />} onClick={() => setSheet("delete")}>
              Delete order
            </Button>
          )}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-30 px-4 pb-2">
        <div className="mx-auto grid w-full max-w-lg grid-cols-2 gap-2">
          <Button size="lg" variant="outline" className="shadow-md" startIcon={<Printer className="h-5 w-5" />} isLoading={printer.busy} onClick={printBill}>
            Print bill
          </Button>
          <Link
            href={routes.ui.pos}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-field bg-brand px-5 text-base font-semibold text-brand-ink shadow-md transition-colors active:bg-brand-strong"
          >
            <Plus className="h-5 w-5" />
            New order
          </Link>
        </div>
      </div>

      <PrinterSheet
        open={sheet === "printer"}
        onOpenChange={(open) => !open && setSheet(null)}
        description={`Order ${formatOrderNumber(order.dailySeq)} prints as soon as the printer is ready.`}
        onReady={() => void printBill()}
      />

      <ConfirmSheet
        open={sheet === "delete"}
        onOpenChange={(open) => !open && setSheet(null)}
        title={`Delete order ${formatOrderNumber(order.dailySeq)}?`}
        description={
          order.restocked
            ? "The order and its lines are removed for good. Stock was already returned when it was cancelled."
            : "The order and its lines are removed for good, and the ingredients it used go back into stock as if it never happened."
        }
        confirmLabel="Delete"
        destructive
        isLoading={isPending}
        onConfirm={handleDelete}
      />

      <ConfirmSheet
        open={sheet === "repeat"}
        onOpenChange={(open) => !open && setSheet(null)}
        title="Replace the current cart?"
        description={`The cart already has ${cartCount} item${cartCount === 1 ? "" : "s"}. Repeating this order will replace them.`}
        confirmLabel="Replace cart"
        onConfirm={repeatOrder}
      />

      <BottomSheet
        open={sheet === "paid"}
        onOpenChange={(open) => !open && setSheet(null)}
        title="Mark as paid"
        description={`${formatMoney(order.total)} received from the customer`}
        footer={
          <Button size="lg" className="w-full" isLoading={isPending} disabled={paymentMethod === ""} onClick={handleMarkPaid}>
            {paymentMethod === "" ? "Pick how it was paid" : "Confirm payment"}
          </Button>
        }
      >
        <Chips<PaymentMethod | "">
          aria-label="Payment method"
          value={paymentMethod}
          onChange={setPaymentMethod}
          options={[{ value: "cash", label: "Cash" }, { value: "online", label: "Online / transfer" }]}
        />
        {errors.paymentMethod && <p className="mt-2 text-xs text-danger">{errors.paymentMethod}</p>}
      </BottomSheet>

      <BottomSheet
        open={sheet === "cancel"}
        onOpenChange={(open) => !open && setSheet(null)}
        title={`Cancel order ${formatOrderNumber(order.dailySeq)}?`}
        description="Cancelled orders are not counted as income."
        footer={
          <div className="grid grid-cols-2 gap-3">
            <Button size="lg" variant="outline" disabled={isPending} onClick={() => setSheet(null)}>
              Keep order
            </Button>
            <Button size="lg" variant="danger" isLoading={isPending} onClick={handleCancel}>
              Cancel order
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Reason"
            placeholder="e.g. customer changed their mind"
            autoComplete="off"
            data-autofocus="true"
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (errors.reason) setErrors({});
            }}
            error={errors.reason}
          />
          <Toggle
            label="Return ingredients to stock"
            description="Switch off if the food was already cooked."
            checked={restock}
            onChange={setRestock}
          />
        </div>
      </BottomSheet>
    </>
  );
}
