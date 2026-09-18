import type { Metadata } from "next";
import { WifiOff } from "lucide-react";
import { config } from "@/config";
import { routes } from "@/utils/routes";

export const metadata: Metadata = { title: "Offline" };

/**
 * Served by the service worker when a screen cannot be fetched. Static on purpose: no
 * session, no database, so it can be cached ahead of time.
 */
export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand/20 text-brand-text">
        <WifiOff className="h-8 w-8" />
      </div>
      <h1 className="text-lg font-semibold">No connection</h1>
      <p className="mt-1 max-w-xs text-sm text-muted">
        {config.appName} needs the internet to take orders and update stock. Check Wi-Fi or mobile data, then try again.
      </p>
      <a
        href={routes.ui.pos}
        className="mt-6 inline-flex h-11 items-center justify-center rounded-field bg-brand px-5 text-sm font-semibold text-brand-ink active:bg-brand-strong"
      >
        Try again
      </a>
    </main>
  );
}
