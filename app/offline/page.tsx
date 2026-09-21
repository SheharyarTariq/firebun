import type { Metadata } from "next";
import { WifiOff } from "lucide-react";
import { config } from "@/config";
import { routes } from "@/utils/routes";

export const metadata: Metadata = { title: "Offline" };

/**
 * Served by the service worker when a screen cannot be fetched. Static on purpose: no
 * session, no database, so it can be cached ahead of time. It must also work without
 * hydrating (its JS may not be in the cache), so "Try again" is a plain link plus a tiny
 * inline script instead of a client component.
 *
 * The address bar still shows the screen that failed, so retrying reloads that screen. Opened
 * directly at /offline there is nothing to reload, so it goes to the counter. The script also
 * retries by itself when the phone reports it is back online.
 */
const RETRY_SCRIPT = `
(function () {
  function retry() {
    location.assign(location.pathname === ${JSON.stringify(routes.ui.offline)} ? ${JSON.stringify(routes.ui.pos)} : location.href);
  }
  addEventListener("online", retry);
  var link = document.getElementById("retry");
  if (link) link.addEventListener("click", function (e) { e.preventDefault(); retry(); });
})();`;

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
        id="retry"
        href={routes.ui.pos}
        className="mt-6 inline-flex h-11 items-center justify-center rounded-field bg-brand px-5 text-sm font-semibold text-brand-ink active:bg-brand-strong"
      >
        Try again
      </a>
      <script dangerouslySetInnerHTML={{ __html: RETRY_SCRIPT }} />
    </main>
  );
}
