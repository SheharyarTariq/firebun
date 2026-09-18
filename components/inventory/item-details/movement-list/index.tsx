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
import Card from "@/components/common/Card";
import EmptyState from "@/components/common/EmptyState";
import type { StockMovementType } from "@/db/schema";
import type { MovementRow } from "@/server/inventory/queries";
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

interface MovementListProps {
  /** Newest first. */
  movements: MovementRow[];
  baseUnit: BaseUnit;
  /** Stock right now — the running balance is walked back from it. */
  currentQty: number;
}

export default function MovementList({ movements, baseUnit, currentQty }: MovementListProps) {
  // Balance after each movement, newest first: undo each delta as we go down the list.
  const balances: number[] = [];
  let running = currentQty;
  for (const m of movements) {
    balances.push(running);
    running -= m.quantityDelta;
  }

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
    <Card className="divide-y divide-border p-0">
      {movements.map((m, index) => {
        const meta = MOVEMENT_META[m.type];
        const positive = m.quantityDelta > 0;
        const after = balances[index];
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
          </div>
        );
      })}
    </Card>
  );
}
