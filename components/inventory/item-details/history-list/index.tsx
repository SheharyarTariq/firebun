"use client";

import { useMemo, useState, useTransition } from "react";
import {
  ArrowDownToLine,
  ClipboardCheck,
  History,
  PackagePlus,
  RotateCcw,
  ShoppingBag,
  Trash2,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import toast from "react-hot-toast";
import { deleteMovementAction, deletePurchaseAction } from "@/app/(app)/(admin)/inventory/actions";
import Button from "@/components/common/Button";
import Card from "@/components/common/Card";
import ConfirmSheet from "@/components/common/ConfirmSheet";
import EmptyState from "@/components/common/EmptyState";
import type { InventoryItem, StockMovementType } from "@/db/schema";
import type { MovementRow, PurchaseRow } from "@/server/inventory/queries";
import { callAction } from "@/utils/call-action";
import { cn } from "@/utils/cn";
import {
  formatCostPerUnit,
  formatDate,
  formatDateTime,
  formatMoney,
  formatMoneyExact,
  formatQty,
  packLabelOf,
  toIsoDate,
} from "@/utils/helper";

const MOVEMENT_META: Record<StockMovementType, { label: string; icon: LucideIcon }> = {
  opening: { label: "Opening stock", icon: ArrowDownToLine },
  purchase: { label: "Purchase", icon: PackagePlus },
  purchase_void: { label: "Purchase voided", icon: Undo2 },
  sale: { label: "Sold", icon: ShoppingBag },
  sale_reversal: { label: "Order cancelled", icon: RotateCcw },
  adjustment: { label: "Stock count", icon: ClipboardCheck },
  wastage: { label: "Wastage", icon: Trash2 },
};

/** Entries typed in by hand can be deleted here; sales and purchases are undone via their record. */
const DELETABLE: StockMovementType[] = ["opening", "adjustment", "wastage"];

/** A purchase row deletes the purchase (and its cost); everything else deletes the ledger entry. */
type DeleteTarget =
  | { kind: "movement"; movement: MovementRow }
  | { kind: "purchase"; movement: MovementRow; purchase: PurchaseRow };

interface HistoryListProps {
  /** Newest first — createdAt order, which is the order recomputeItem replays. */
  movements: MovementRow[];
  /** Joined onto purchase movements by id; a row outside the window stays a plain ledger line. */
  purchases: PurchaseRow[];
  item: InventoryItem;
}

export default function HistoryList({ movements, purchases, item }: HistoryListProps) {
  const [target, setTarget] = useState<DeleteTarget | null>(null);
  const [isPending, startTransition] = useTransition();

  // recordPurchase is the only writer of referenceType "purchase", so the id is an exact link.
  const purchaseById = useMemo(() => new Map(purchases.map((p) => [p.id, p])), [purchases]);

  // Balance after each movement, newest first: undo each delta as we go down the list.
  const balances: number[] = [];
  let running = item.currentQty;
  for (const m of movements) {
    balances.push(running);
    running -= m.quantityDelta;
  }

  const unitNameOf = (p: PurchaseRow) =>
    p.enteredUnit === "pack" ? packLabelOf(item) : p.enteredUnit;

  const handleDelete = () => {
    if (!target) return;
    startTransition(async () => {
      const result = await callAction(
        target.kind === "purchase"
          ? deletePurchaseAction(target.purchase.id)
          : deleteMovementAction(target.movement.id)
      );
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        `${target.kind === "purchase" ? "Purchase" : "Entry"} deleted · ${formatQty(result.data.currentQty, item.baseUnit)} in stock`
      );
      setTarget(null);
    });
  };

  if (movements.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="No history yet"
        description="Purchases, sales, counts and wastage will show up here."
        className="py-10"
      />
    );
  }

  const confirm =
    target === null
      ? null
      : target.kind === "purchase"
        ? {
            title: "Delete this purchase?",
            description: `${target.purchase.enteredQty} ${unitNameOf(target.purchase)} for ${formatMoney(target.purchase.totalCost)} disappears from the ledger and from spend reports. Stock and average cost are recalculated as if it was never entered.`,
          }
        : {
            title: `Delete this ${MOVEMENT_META[target.movement.type].label.toLowerCase()} entry?`,
            description: `${target.movement.quantityDelta > 0 ? "+" : "−"}${formatQty(Math.abs(target.movement.quantityDelta), item.baseUnit)} from ${formatDateTime(target.movement.createdAt)} is removed and the stock figure is recalculated from the remaining entries.`,
          };

  return (
    <>
      <Card className="divide-y divide-border p-0">
        {movements.map((m, index) => {
          const meta = MOVEMENT_META[m.type];
          const positive = m.quantityDelta > 0;
          const after = balances[index];

          // Branch on the movement type, never on "did the lookup hit": a purchase_void row
          // carries the same referenceId and must not grow a money block of its own.
          const linked =
            m.referenceType === "purchase" && m.referenceId !== null
              ? (purchaseById.get(m.referenceId) ?? null)
              : null;
          const purchase = m.type === "purchase" ? linked : null;
          const voidReason =
            (m.type === "purchase_void" ? linked : purchase)?.voidReason ?? null;
          const voided = purchase !== null && purchase.voidedAt !== null;

          // A purchase movement's own note is the generated "Purchase — Metro"; the owner's
          // typed note lives on the purchase record.
          const note = purchase ? purchase.note : m.note;

          // purchaseDate is a shop-local calendar date, createdAt is when it was typed in.
          // A backdated purchase sits at the top of the list, so name both dates.
          const backdated = purchase !== null && toIsoDate(m.createdAt) !== purchase.purchaseDate;
          const metaLine = [
            backdated && purchase ? `Bought ${formatDate(purchase.purchaseDate)}` : null,
            backdated ? `entered ${formatDate(m.createdAt)}` : formatDateTime(m.createdAt),
            purchase?.supplier ?? null,
            m.createdByUser.name,
          ]
            .filter(Boolean)
            .join(" · ");

          // A purchase we cannot name cannot be confirmed, so it degrades to read-only.
          const deleteTarget: DeleteTarget | null = purchase
            ? voided
              ? null
              : { kind: "purchase", movement: m, purchase }
            : DELETABLE.includes(m.type)
              ? { kind: "movement", movement: m }
              : null;

          return (
            <div key={m.id} className={cn("px-4 py-3", voided && "opacity-60")}>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted-bg text-muted">
                  <meta.icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className={cn("truncate font-medium", voided && "line-through")}>
                    {meta.label}
                  </p>
                  {/* Two dates plus a name will not fit one phone line; let that rare row wrap. */}
                  <p className={cn("text-xs text-muted", backdated ? "break-words" : "truncate")}>
                    {metaLine}
                  </p>
                  {note && <p className="truncate text-xs text-muted">{note}</p>}
                </div>
                <div className="shrink-0 text-right">
                  <p
                    className={cn(
                      "font-semibold tabular-nums",
                      positive ? "text-success" : "text-foreground"
                    )}
                  >
                    {positive ? "+" : "−"}
                    {formatQty(Math.abs(m.quantityDelta), item.baseUnit)}
                  </p>
                  <p className={cn("text-xs tabular-nums", after < 0 ? "text-danger" : "text-muted")}>
                    = {formatQty(after, item.baseUnit)}
                  </p>
                </div>
                {deleteTarget && (
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={
                      deleteTarget.kind === "purchase"
                        ? "Delete purchase"
                        : `Delete ${meta.label.toLowerCase()} entry`
                    }
                    className="-mr-2 shrink-0 text-muted"
                    onClick={() => setTarget(deleteTarget)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {purchase && (
                <div
                  className={cn(
                    // ml-11 lines the money up with the label: 32px bubble + 12px gap.
                    "ml-11 mt-1.5 space-y-0.5 text-xs tabular-nums",
                    voided && "line-through"
                  )}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="min-w-0 truncate text-muted">
                      {purchase.enteredQty} {unitNameOf(purchase)}
                      {purchase.enteredUnit === "pack" &&
                        purchase.packSize !== null &&
                        ` × ${formatQty(purchase.packSize, item.baseUnit)}`}
                    </span>
                    <span className="shrink-0 font-semibold text-foreground">
                      {formatMoney(purchase.totalCost)}
                    </span>
                  </div>
                  <p className="text-muted">
                    {formatMoneyExact(
                      purchase.enteredQty > 0 ? purchase.totalCost / purchase.enteredQty : 0
                    )}{" "}
                    / {unitNameOf(purchase)}
                    {/* The per-base-unit price, unless it would repeat the line above. */}
                    {purchase.enteredUnit !== item.displayUnit && (
                      <>
                        {" · "}
                        <span className="text-foreground">
                          {formatCostPerUnit(purchase.unitCost, item.displayUnit)}
                        </span>
                      </>
                    )}
                  </p>
                </div>
              )}

              {voidReason && <p className="ml-11 mt-1 text-xs text-danger">Voided — {voidReason}</p>}
            </div>
          );
        })}
      </Card>

      <ConfirmSheet
        open={target !== null}
        onOpenChange={(open) => !open && setTarget(null)}
        title={confirm?.title ?? "Delete entry?"}
        description={confirm?.description}
        confirmLabel="Delete"
        destructive
        isLoading={isPending}
        onConfirm={handleDelete}
      />
    </>
  );
}
