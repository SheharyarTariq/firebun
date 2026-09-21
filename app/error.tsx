"use client";

import { useEffect } from "react";
import { RotateCcw, TriangleAlert } from "lucide-react";
import Button from "@/components/common/Button";
import EmptyState from "@/components/common/EmptyState";
import { config } from "@/config";

/**
 * Catches failures in `app/(app)/layout.tsx` itself (signed-in user, settings, tab badges):
 * an error.tsx never wraps the layout of its own folder, so without this file those errors
 * fell through to Next's bare "This page couldn't load". The tab bar is part of that layout,
 * so it is not shown here.
 */
export default function RootError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col bg-background">
      <header className="bg-ink px-4 text-ink-foreground pt-safe">
        <div className="flex h-14 items-center">
          <h1 className="text-lg font-semibold">{config.appName}</h1>
        </div>
        <div aria-hidden className="-mx-4 h-0.5 bg-gradient-to-r from-brand via-brand-strong to-brand" />
      </header>
      <EmptyState
        className="flex-1"
        icon={TriangleAlert}
        title="The app couldn't load"
        description="Nothing was saved. This is usually a short connection hiccup — try again in a moment."
        action={
          <div className="flex flex-col items-center gap-2">
            <Button startIcon={<RotateCcw className="h-4 w-4" />} onClick={() => unstable_retry()}>
              Try again
            </Button>
            {error.digest && <p className="pt-4 font-mono text-xs text-muted">Error code: {error.digest}</p>}
          </div>
        }
      />
    </main>
  );
}
