import { TableSkeleton } from "@/components/common/Skeleton";

/** The layout keeps the header, period chips and tabs; only the table is replaced. */
export default function Loading() {
  return <TableSkeleton />;
}
