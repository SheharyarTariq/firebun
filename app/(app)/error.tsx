"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw, TriangleAlert } from "lucide-react";
import Button from "@/components/common/Button";
import EmptyState from "@/components/common/EmptyState";
import PageHeader from "@/components/layout/page-header";
import { routes } from "@/utils/routes";

/** Shown instead of a screen that crashed; the shell (tab bar) stays usable. */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <>
      <PageHeader title="Something went wrong" />
      <EmptyState
        icon={TriangleAlert}
        title="This screen could not load"
        description="Nothing was saved. Check the connection and try again, or go back to the counter."
        action={
          <div className="flex flex-col items-center gap-2">
            <Button startIcon={<RotateCcw className="h-4 w-4" />} onClick={reset}>
              Try again
            </Button>
            <Link href={routes.ui.pos} className="text-sm text-muted underline">
              Back to the counter
            </Link>
          </div>
        }
      />
    </>
  );
}
