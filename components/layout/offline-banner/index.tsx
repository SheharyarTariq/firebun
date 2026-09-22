"use client";

import { useSyncExternalStore } from "react";
import { WifiOff } from "lucide-react";

function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

/**
 * Small pill under the header while the phone has no connection, so the cashier knows before
 * tapping Place order (an action only reveals it by failing). Renders nothing when online.
 */
export default function OfflineBanner() {
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true
  );
  if (online) return null;

  return (
    // `top-canopy` is the canopy's real height. This used to hard-code 3.75rem against a 3.5rem
    // header plus a 2px rule, so the pill landed on the first control of every screen.
    <div className="top-canopy pointer-events-none fixed inset-x-0 z-40 pt-2">
      <div className="page-gutter flex justify-center">
      <p
        role="status"
        className="flex items-center gap-1.5 rounded-full bg-warning-bg px-3 py-1.5 text-caption normal-case tracking-normal text-warning shadow-2"
      >
        <WifiOff aria-hidden className="h-3.5 w-3.5" />
        Offline — orders can’t be placed until you reconnect
      </p>
      </div>
    </div>
  );
}
