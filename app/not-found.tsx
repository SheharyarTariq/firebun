import Link from "next/link";
import { SearchX } from "lucide-react";
import EmptyState from "@/components/common/EmptyState";
import { routes } from "@/utils/routes";

/** Unknown URLs outside the app shell (typed by hand, stale bookmarks). */
export default function RootNotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background">
      <EmptyState
        icon={SearchX}
        title="That page does not exist"
        description="Check the address, or head back to the counter."
        action={
          <Link
            href={routes.ui.pos}
            className="inline-flex h-11 items-center justify-center rounded-field bg-brand px-4 text-sm font-semibold text-brand-ink active:bg-brand-strong"
          >
            Go to the counter
          </Link>
        }
      />
    </main>
  );
}
