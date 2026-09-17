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
  movements: MovementRow[];
  baseUnit: BaseUnit;
}

export default function MovementList({ movements, baseUnit }: MovementListProps) {
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
      {movements.map((m) => {
        const meta = MOVEMENT_META[m.type];
        const positive = m.quantityDelta > 0;
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
            <p
              className={cn(
                "shrink-0 font-semibold tabular-nums",
                positive ? "text-success" : "text-foreground"
              )}
            >
              {positive ? "+" : "−"}
              {formatQty(Math.abs(m.quantityDelta), baseUnit)}
            </p>
          </div>
        );
      })}
    </Card>
  );
}
