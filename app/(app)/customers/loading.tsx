import PageSkeleton from "@/components/layout/page-skeleton";
import { routes } from "@/utils/routes";

export default function Loading() {
  return <PageSkeleton title="Customers" backHref={routes.ui.more} variant="list" filters rows={5} />;
}
