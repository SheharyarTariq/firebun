import Card from "@/components/common/Card";
import { cn } from "@/utils/cn";

/** Grey placeholder block for loading states. Size it with width/height classes. */
export default function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-md bg-muted-bg", className)} />;
}

const CHIP_WIDTHS = ["w-16", "w-24", "w-14", "w-20"];

/** A row of filter chips. */
export function ChipsSkeleton() {
  return (
    <div className="flex gap-2 py-1">
      {CHIP_WIDTHS.map((w, i) => (
        <Skeleton key={i} className={cn("h-9 rounded-full", w)} />
      ))}
    </div>
  );
}

/** A card of list rows (orders, inventory, expenses…). */
export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <Card className="divide-y divide-border p-0">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <Skeleton className="h-11 w-14 rounded-field" />
          <div className="flex-1 space-y-2">
            <Skeleton className={cn("h-3.5", i % 2 ? "w-3/4" : "w-1/2")} />
            <Skeleton className="h-3 w-2/5" />
          </div>
          <Skeleton className="h-4 w-14" />
        </div>
      ))}
    </Card>
  );
}

/** The counter's 2-column item grid. */
export function GridSkeleton({ cards = 8 }: { cards?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="min-h-24 space-y-3 rounded-card border border-border bg-surface p-3">
          <Skeleton className={cn("h-3.5", i % 3 === 0 ? "w-4/5" : "w-3/5")} />
          <Skeleton className="h-3 w-2/5" />
          <div className="flex items-end justify-between pt-2">
            <Skeleton className="h-4 w-14" />
            <Skeleton className="h-7 w-7 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** KPI tiles plus a breakdown card (finance). */
export function TilesSkeleton() {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="space-y-2 p-3">
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-3 w-2/3" />
          </Card>
        ))}
      </div>
      <Card className="space-y-3">
        <Skeleton className="h-3 w-1/4" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex justify-between">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3.5 w-16" />
          </div>
        ))}
      </Card>
    </>
  );
}

/** Labelled inputs (settings, printer). */
export function FormSkeleton({ fields = 5 }: { fields?: number }) {
  return (
    <Card className="space-y-5">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-3.5 w-1/3" />
          <Skeleton className="h-12 w-full rounded-field" />
        </div>
      ))}
    </Card>
  );
}

/** Summary card, action row and a short list (item / order details). */
export function DetailSkeleton() {
  return (
    <>
      <Card className="space-y-3">
        <div className="flex justify-between">
          <Skeleton className="h-3.5 w-1/3" />
          <Skeleton className="h-3.5 w-16" />
        </div>
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-3 w-2/3" />
      </Card>
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-11 rounded-field" />
        ))}
      </div>
      <ListSkeleton rows={4} />
    </>
  );
}
