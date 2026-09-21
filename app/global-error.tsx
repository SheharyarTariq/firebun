"use client";

import "./globals.css";

/**
 * Last resort when the root layout itself fails. It replaces the whole document, so it
 * brings its own <html>/<body> and styles and uses no app components.
 */
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 text-center font-sans">
        <title>Fire Bun</title>
        <h1 className="text-lg font-semibold">The app couldn&apos;t load</h1>
        <p className="mt-1 max-w-xs text-sm text-muted">Nothing was saved. Try again in a moment.</p>
        <button
          type="button"
          onClick={() => unstable_retry()}
          className="mt-6 h-11 rounded-field bg-brand px-5 text-sm font-semibold text-brand-ink active:bg-brand-strong"
        >
          Try again
        </button>
        {error.digest && <p className="mt-6 font-mono text-xs text-muted">Error code: {error.digest}</p>}
      </body>
    </html>
  );
}
