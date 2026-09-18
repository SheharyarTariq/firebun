import { ListSkeleton } from "@/components/common/Skeleton";

/** The layout keeps the header and period chips; only the list is replaced. */
export default function Loading() {
  return <ListSkeleton rows={5} />;
}
