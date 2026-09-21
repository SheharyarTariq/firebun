"use client";

import { useState, useTransition } from "react";
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
import { deleteMovementAction } from "@/app/(app)/(admin)/inventory/actions";
import Button from "@/components/common/Button";
import Card from "@/components/common/Card";
import ConfirmSheet from "@/components/common/ConfirmSheet";
import EmptyState from "@/components/common/EmptyState";
import type { StockMovementType } from "@/db/schema";
import type { MovementRow } from "@/server/inventory/queries";
import { callAction } from "@/utils/call-action";
import { cn } from "@/utils/cn";
import { formatDateTime, formatQty, type BaseUnit } from "@/utils/helper";

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

interface MovementListProps {
  /** Newest first. */
  movements: MovementRow[];
  baseUnit: BaseUnit;
  /** Stock right now — the running balance is walked back from it. */
  currentQty: number;
}

export default function MovementList({ movements, baseUnit, currentQty }: MovementListProps) {
  const [target, setTarget] = useState<MovementRow | null>(null);
  const [isPending, startTransition] = useTransition();

  // Balance after each movement, newest first: undo each delta as we go down the list.
  const balances: number[] = [];
  let running = currentQty;
  for (const m of movements) {
    balances.push(running);
    running -= m.quantityDelta;
  }

  const handleDelete = () => {
    if (!target) return;
    startTransition(async () => {
      const result = await callAction(deleteMovementAction(target.id));
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Entry deleted · ${formatQty(result.data.currentQty, baseUnit)} in stock`);
      setTarget(null);
    });
  };

  if (movements.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="No movements yet"
        description="Purchases, sales, counts and wastage will show up here."
        className="py-10"
      />
    );
  }

  return (
    <>
      <Card className="divide-y divide-border p-0">
        {movements.map((m, index) => {
          const meta = MOVEMENT_META[m.type];
          const positive = m.quantityDelta > 0;
          const after = balances[index];
          const deletable = DELETABLE.includes(m.type);
          return (
            <div key={m.id} className="flex items-start gap-3 px-4 py-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted-bg text-muted">
                <meta.icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{meta.label}</p>
                {m.note && <p className="truncate text-xs text-muted">{m.note}</p>}
                <p className="text-xs text-muted">
                  {formatDateTime(m.createdAt)} · {m.createdByUser.name}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className={cn("font-semibold tabular-nums", positive ? "text-success" : "text-foreground")}>
                  {positive ? "+" : "−"}
                  {formatQty(Math.abs(m.quantityDelta), baseUnit)}
                </p>
                <p className={cn("text-xs tabular-nums", after < 0 ? "text-danger" : "text-muted")}>= {formatQty(after, baseUnit)}</p>
              </div>
              {deletable && (
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Delete ${meta.label.toLowerCase()} entry`}
                  className="-mr-2 shrink-0 text-muted"
                  onClick={() => setTarget(m)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          );
        })}
      </Card>

      <ConfirmSheet
        open={target !== null}
        onOpenChange={(open) => !open && setTarget(null)}
        title={target ? `Delete this ${MOVEMENT_META[target.type].label.toLowerCase()} entry?` : "Delete entry?"}
        description={
          target
            ? `${target.quantityDelta > 0 ? "+" : "−"}${formatQty(Math.abs(target.quantityDelta), baseUnit)} from ${formatDateTime(target.createdAt)} is removed and the stock figure is recalculated from the remaining entries.`
            : undefined
        }
        confirmLabel="Delete"
        destructive
        isLoading={isPending}
        onConfirm={handleDelete}
      />
    </>
  );
}
