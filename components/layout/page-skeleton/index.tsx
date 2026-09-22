import Skeleton, {
  ChipsSkeleton,
  DetailSkeleton,
  FormSkeleton,
  GridSkeleton,
  ListSkeleton,
  TilesSkeleton,
} from "@/components/common/Skeleton";
import PageHeader from "@/components/layout/page-header";
import PageBody from "@/components/layout/page-body";

export type SkeletonVariant = "list" | "grid" | "tiles" | "form" | "detail" | "more";

interface PageSkeletonProps {
  title: string;
  /** Detail pages show a back arrow; the real page decides where it goes. */
  backHref?: string;
  variant?: SkeletonVariant;
  /** Show a filter row under the header (search / chips). */
  filters?: boolean;
  rows?: number;
  /** Match a screen whose canopy carries a hero figure, so the header doesn't jump on load. */
  hero?: boolean;
}

/**
 * Loading state for a whole screen: the real dark header with the right title so a tab
 * switch never blanks the top, plus grey blocks shaped like the content that follows.
 */
export default function PageSkeleton({
  title,
  backHref,
  variant = "list",
  filters = false,
  rows = 6,
  hero = false,
}: PageSkeletonProps) {
  return (
    <>
      <PageHeader
        title={title}
        backHref={backHref}
        hero={hero ? <Skeleton className="h-9 w-40 rounded-field bg-white/10" /> : undefined}
      />
      <PageBody>
        <div className="space-y-3" aria-busy="true" aria-label="Loading">
          {(filters || variant === "tiles") && (
            <div className="space-y-2">
              {(variant === "grid" || variant === "list") && <Skeleton className="h-12 w-full rounded-field" />}
              <ChipsSkeleton />
            </div>
          )}
          {variant === "list" && <ListSkeleton rows={rows} />}
          {variant === "grid" && <GridSkeleton />}
          {variant === "tiles" && <TilesSkeleton />}
          {variant === "form" && <FormSkeleton />}
          {variant === "detail" && <DetailSkeleton />}
          {variant === "more" && <MoreSkeleton />}
        </div>
      </PageBody>
    </>
  );
}

/**
 * More is a profile card, a figures tile and two groups of rows — nothing like the five-field
 * form it used to borrow, which made the whole screen visibly rebuild on every load.
 */
function MoreSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-20 w-full rounded-card" />
      <Skeleton className="h-28 w-full rounded-card" />
      <Skeleton className="h-72 w-full rounded-card" />
      <Skeleton className="h-12 w-full rounded-field" />
      <Skeleton className="h-12 w-full rounded-field" />
    </div>
  );
}
