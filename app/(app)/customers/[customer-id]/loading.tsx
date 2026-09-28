import PageSkeleton from "@/components/layout/page-skeleton";
import { routes } from "@/utils/routes";

export default function Loading() {
  return <PageSkeleton title="Customer" backHref={routes.ui.customers} variant="detail" />;
}
