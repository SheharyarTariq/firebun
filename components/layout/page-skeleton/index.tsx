import Skeleton, {
  ChipsSkeleton,
  DetailSkeleton,
  FormSkeleton,
  GridSkeleton,
  ListSkeleton,
  TilesSkeleton,
} from "@/components/common/Skeleton";
import PageHeader from "@/components/layout/page-header";

export type SkeletonVariant = "list" | "grid" | "tiles" | "form" | "detail";

interface PageSkeletonProps {
  title: string;
  /** Detail pages show a back arrow; the real page decides where it goes. */
  backHref?: string;
  variant?: SkeletonVariant;
  /** Show a filter row under the header (search / chips). */
  filters?: boolean;
  rows?: number;
}

/**
 * Loading state for a whole screen: the real dark header with the right title so a tab
 * switch never blanks the top, plus grey blocks shaped like the content that follows.
 */
export default function PageSkeleton({ title, backHref, variant = "list", filters = false, rows = 6 }: PageSkeletonProps) {
  return (
    <>
      <PageHeader title={title} backHref={backHref} />
      <div className="space-y-3 p-4" aria-busy="true" aria-label="Loading">
        {(filters || variant === "tiles") && (
          <div className="space-y-2">
            {variant === "grid" && <Skeleton className="h-12 w-full rounded-field" />}
            <ChipsSkeleton />
          </div>
        )}
        {variant === "list" && <ListSkeleton rows={rows} />}
        {variant === "grid" && <GridSkeleton />}
        {variant === "tiles" && <TilesSkeleton />}
        {variant === "form" && <FormSkeleton />}
        {variant === "detail" && <DetailSkeleton />}
      </div>
    </>
  );
}
