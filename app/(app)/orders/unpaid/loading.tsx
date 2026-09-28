import PageSkeleton from "@/components/layout/page-skeleton";
import { routes } from "@/utils/routes";

export default function Loading() {
  return <PageSkeleton title="Unpaid" backHref={routes.ui.orders} variant="list" rows={4} />;
}
