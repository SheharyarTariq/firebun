"use client";

import { useState, useTransition } from "react";
import { PackagePlus } from "lucide-react";
import toast from "react-hot-toast";
import { voidPurchaseAction } from "@/app/(app)/(admin)/inventory/actions";
import Badge from "@/components/common/Badge";
import Button from "@/components/common/Button";
import Card from "@/components/common/Card";
import ConfirmSheet from "@/components/common/ConfirmSheet";
import EmptyState from "@/components/common/EmptyState";
import Input from "@/components/common/Input";
import type { PurchaseRow } from "@/server/inventory/queries";
import { cn } from "@/utils/cn";
import {
  formatDate,
  formatMoney,
  formatMoneyExact,
  formatQty,
  packLabelOf,
  type PackAware,
} from "@/utils/helper";
import { validateAndSetErrors } from "@/utils/validation";
import { voidPurchaseSchema } from "../../schema";

interface PurchaseListProps {
  purchases: PurchaseRow[];
  item: PackAware;
}

export default function PurchaseList({ purchases, item }: PurchaseListProps) {
  const [target, setTarget] = useState<PurchaseRow | null>(null);
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  const close = () => {
    setTarget(null);
    setReason("");
    setErrors({});
  };

  const handleVoid = async () => {
    if (!target) return;
    if (!(await validateAndSetErrors(voidPurchaseSchema, { reason }, setErrors))) return;
    startTransition(async () => {
      const result = await voidPurchaseAction(target.id, { reason });
      if (!result.ok) {
        if (result.fieldErrors) setErrors(result.fieldErrors);
        toast.error(result.error);
        return;
      }
      toast.success("Purchase voided and stock recalculated");
      close();
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

  return (
    <>
      <Card className="divide-y divide-border p-0">
        {purchases.map((p) => {
          const voided = Boolean(p.voidedAt);
          const perUnit = p.enteredQty > 0 ? p.totalCost / p.enteredQty : 0;
          const isPack = p.enteredUnit === "pack";
          const unitName = isPack ? packLabelOf(item) : p.enteredUnit;
          return (
            <div key={p.id} className={cn("px-4 py-3", voided && "opacity-60")}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className={cn("font-medium tabular-nums", voided && "line-through")}>
                    {p.enteredQty} {unitName}
                    {isPack && p.packSize !== null && (
                      <span className="font-normal text-muted">
                        {" "}
                        × {formatQty(p.packSize, item.baseUnit)}
                      </span>
                    )}
                    <span className="font-normal text-muted">
                      {" "}
                      @ {formatMoneyExact(perUnit)} / {unitName}
                    </span>
                  </p>
                  <p className="truncate text-xs text-muted">
                    {formatDate(p.purchaseDate)}
                    {p.supplier ? ` · ${p.supplier}` : ""} · {p.createdByUser.name}
                  </p>
                  {p.note && <p className="truncate text-xs text-muted">{p.note}</p>}
                  {voided && (
                    <p className="mt-1 text-xs text-danger">Voided — {p.voidReason}</p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <p className={cn("font-semibold tabular-nums", voided && "line-through")}>
                    {formatMoney(p.totalCost)}
                  </p>
                  {voided ? (
                    <Badge variant="danger">Voided</Badge>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => setTarget(p)}>
                      Void
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
        onOpenChange={(open) => !open && close()}
        title="Void this purchase?"
        description={
          target
            ? `${target.enteredQty} ${target.enteredUnit === "pack" ? packLabelOf(item) : target.enteredUnit} for ${formatMoney(target.totalCost)} will be removed from stock and from spend reports.`
            : undefined
        }
        confirmLabel="Void purchase"
        destructive
        isLoading={isPending}
        onConfirm={handleVoid}
      >
        <Input
          label="Reason"
          placeholder="e.g. Entered twice"
          autoComplete="off"
          autoFocus
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            if (errors.reason) setErrors({});
          }}
          error={errors.reason}
        />
      </ConfirmSheet>
    </>
  );
}
