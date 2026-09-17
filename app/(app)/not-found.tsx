import Link from "next/link";
import { SearchX } from "lucide-react";
import EmptyState from "@/components/common/EmptyState";
import PageHeader from "@/components/layout/page-header";
import { routes } from "@/utils/routes";

/** `notFound()` from a detail page (order, inventory item, menu item) lands here. */
export default function AppNotFound() {
  return (
    <>
      <PageHeader title="Not found" backHref={routes.ui.pos} />
      <EmptyState
        icon={SearchX}
        title="That page does not exist"
        description="It may have been deleted, or the link is wrong."
        action={
          <Link
            href={routes.ui.pos}
            className="inline-flex h-11 items-center justify-center rounded-field bg-brand px-4 text-sm font-semibold text-brand-ink active:bg-brand-strong"
          >
            Go to the counter
          </Link>
        }
      />
    </>
  );
}
