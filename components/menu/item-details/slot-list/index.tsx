import { Layers } from "lucide-react";
import Badge from "@/components/common/Badge";
import Card from "@/components/common/Card";
import EmptyState from "@/components/common/EmptyState";
import type { DealSlotFull } from "@/server/menu/queries";

interface SlotListProps {
  slots: DealSlotFull[];
  onEdit: (slot: DealSlotFull) => void;
}

export default function SlotList({ slots, onEdit }: SlotListProps) {
  if (slots.length === 0) {
    return (
      <EmptyState
        icon={Layers}
        title="No slots yet"
        description="Each slot is one thing the customer gets, e.g. “2 × Medium Pizza” with the pizzas they can pick from."
        className="py-8"
      />
    );
  }

  return (
    <Card className="divide-y divide-border p-0">
      {slots.map((slot) => {
        const broken = slot.options.filter((o) => !o.variant.isActive || !o.variant.item.isActive);
        const names = slot.options
          .slice(0, 3)
          .map((o) =>
            o.variant.name === "Regular" ? o.variant.item.name : `${o.variant.item.name} (${o.variant.name})`
          );
        return (
          <button
            key={slot.id}
            type="button"
            onClick={() => onEdit(slot)}
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-surface-2"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/25 text-sm font-bold text-brand-strong">
              {slot.quantity}×
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{slot.label}</span>
              <span className="block truncate text-xs text-muted">
                {slot.options.length === 1 ? names[0] : `Choice of ${slot.options.length}: ${names.join(", ")}${slot.options.length > 3 ? "…" : ""}`}
              </span>
            </span>
            {broken.length > 0 && <Badge variant="danger">{broken.length} unavailable</Badge>}
          </button>
        );
      })}
    </Card>
  );
}
