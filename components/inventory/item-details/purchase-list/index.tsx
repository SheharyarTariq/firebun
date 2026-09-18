"use client";

import { useState, useTransition } from "react";
import { PackagePlus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { deletePurchaseAction } from "@/app/(app)/(admin)/inventory/actions";
import Badge from "@/components/common/Badge";
import Button from "@/components/common/Button";
import Card from "@/components/common/Card";
import ConfirmSheet from "@/components/common/ConfirmSheet";
import EmptyState from "@/components/common/EmptyState";
import type { PurchaseRow } from "@/server/inventory/queries";
import { callAction } from "@/utils/call-action";
import { cn } from "@/utils/cn";
import {
  formatDate,
  formatMoney,
  formatMoneyExact,
  formatQty,
  packLabelOf,
  type PackAware,
} from "@/utils/helper";

interface PurchaseListProps {
  purchases: PurchaseRow[];
  item: PackAware;
}

export default function PurchaseList({ purchases, item }: PurchaseListProps) {
  const [target, setTarget] = useState<PurchaseRow | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (!target) return;
    startTransition(async () => {
      const result = await callAction(deletePurchaseAction(target.id));
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Purchase deleted · ${formatQty(result.data.currentQty, item.baseUnit)} in stock`);
      setTarget(null);
    });
  };

  if (purchases.length === 0) {
    return (
      <EmptyState
        icon={PackagePlus}
        title="No purchases yet"
        description="Tap Purchase to record what you bought and for how much."
        className="py-10"
      />
    );
  }

  const unitName = (p: PurchaseRow) => (p.enteredUnit === "pack" ? packLabelOf(item) : p.enteredUnit);

  return (
    <>
      <Card className="divide-y divide-border p-0">
        {purchases.map((p) => {
          // Rows voided before deletion existed stay struck through for the record.
          const voided = Boolean(p.voidedAt);
          const perUnit = p.enteredQty > 0 ? p.totalCost / p.enteredQty : 0;
          const isPack = p.enteredUnit === "pack";
          return (
            <div key={p.id} className={cn("px-4 py-3", voided && "opacity-60")}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className={cn("font-medium tabular-nums", voided && "line-through")}>
                    {p.enteredQty} {unitName(p)}
                    {isPack && p.packSize !== null && (
                      <span className="font-normal text-muted">
                        {" "}
                        × {formatQty(p.packSize, item.baseUnit)}
                      </span>
                    )}
                    <span className="font-normal text-muted">
                      {" "}
                      @ {formatMoneyExact(perUnit)} / {unitName(p)}
                    </span>
                  </p>
                  <p className="truncate text-xs text-muted">
                    {formatDate(p.purchaseDate)}
                    {p.supplier ? ` · ${p.supplier}` : ""} · {p.createdByUser.name}
                  </p>
                  {p.note && <p className="truncate text-xs text-muted">{p.note}</p>}
                  {voided && <p className="mt-1 text-xs text-danger">Voided — {p.voidReason}</p>}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <p className={cn("font-semibold tabular-nums", voided && "line-through")}>{formatMoney(p.totalCost)}</p>
                  {voided ? (
                    <Badge variant="danger">Voided</Badge>
                  ) : (
                    <Button size="sm" variant="ghost" className="text-danger" aria-label="Delete purchase" onClick={() => setTarget(p)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </Card>

      <ConfirmSheet
        open={target !== null}
        onOpenChange={(open) => !open && setTarget(null)}
        title="Delete this purchase?"
        description={
          target
            ? `${target.enteredQty} ${unitName(target)} for ${formatMoney(target.totalCost)} disappears from the ledger and from spend reports. Stock and average cost are recalculated as if it was never entered.`
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
