"use client";

import { useState, useTransition } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowUpToLine, GripVertical } from "lucide-react";
import toast from "react-hot-toast";
import { reorderMenuItemsAction } from "@/app/(app)/(admin)/menu/actions";
import Badge from "@/components/common/Badge";
import type { CatalogItem } from "@/server/orders/queries";
import { callAction } from "@/utils/call-action";
import { cn } from "@/utils/cn";
import { formatMoney } from "@/utils/helper";

interface ArrangeGridProps {
  categoryId: number;
  /** The category's items in their current counter order. Read once: remount per category. */
  items: CatalogItem[];
}

/**
 * Admin-only arrange mode for one category of the counter grid. Cards drag by their grip (so the
 * grid still scrolls under a thumb anywhere else) and every drop saves straight away; the order
 * shown is local, so the server refresh after a save cannot pull a card back mid-drag.
 */
export default function ArrangeGrid({ categoryId, items }: ArrangeGridProps) {
  const [order, setOrder] = useState(() => items.map((i) => i.id));
  const [, startTransition] = useTransition();
  const byId = new Map(items.map((i) => [i.id, i]));
  // An item added or removed while arranging: keep what we know, drop what is gone.
  const shown = order.filter((id) => byId.has(id));

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const save = (next: number[]) => {
    const previous = order;
    setOrder(next);
    startTransition(async () => {
      const result = await callAction(reorderMenuItemsAction(categoryId, next));
      if (!result.ok) {
        setOrder(previous);
        toast.error(result.error);
      }
    });
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = shown.indexOf(Number(active.id));
    const to = shown.indexOf(Number(over.id));
    if (from < 0 || to < 0) return;
    save(arrayMove(shown, from, to));
  };

  const moveToTop = (id: number) => save([id, ...shown.filter((x) => x !== id)]);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={shown} strategy={rectSortingStrategy}>
        <div className="grid auto-rows-fr grid-cols-2 gap-2.5 pt-2 min-[480px]:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {shown.map((id, index) => (
            <ArrangeCard key={id} item={byId.get(id)!} isFirst={index === 0} onMoveToTop={() => moveToTop(id)} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

interface ArrangeCardProps {
  item: CatalogItem;
  isFirst: boolean;
  onMoveToTop: () => void;
}

function ArrangeCard({ item, isFirst, onMoveToTop }: ArrangeCardProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });
  const isDeal = item.kind === "deal";
  const min = Math.min(...item.variants.map((v) => v.price));

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "relative flex flex-col rounded-card border border-dashed border-border p-2.5 shadow-1",
        isDeal ? "bg-ink text-ink-foreground" : "bg-surface",
        isDragging && "z-10 scale-[1.03] shadow-lg ring-2 ring-brand"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="line-clamp-2 text-heading">{item.name}</span>
        {isDeal && <Badge variant="brand">Deal</Badge>}
      </div>
      <div className="mt-0.5 flex min-w-0 flex-1 items-start">
        <span className={cn("min-w-0 truncate text-body money", isDeal && "text-brand")}>
          {item.variants.length > 1 && <span className="font-normal text-muted">from </span>}
          {formatMoney(min)}
        </span>
      </div>

      <div className="mt-2 flex h-11 items-center justify-between gap-2">
        <button
          type="button"
          onClick={onMoveToTop}
          disabled={isFirst}
          aria-label={`Move ${item.name} to the top`}
          className="flex h-11 w-11 items-center justify-center rounded-full text-muted transition-colors active:bg-surface-2 disabled:opacity-30"
        >
          <ArrowUpToLine className="h-5 w-5" />
        </button>
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={`Drag to reorder ${item.name}`}
          className="flex h-11 w-11 cursor-grab touch-none items-center justify-center rounded-full bg-brand text-brand-ink active:cursor-grabbing"
        >
          <GripVertical className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
