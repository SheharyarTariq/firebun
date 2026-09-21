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
    <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+3.75rem)] z-40 flex justify-center px-4">
      <p
        role="status"
        className="flex items-center gap-1.5 rounded-full bg-warning-bg px-3 py-1.5 text-xs font-semibold text-warning shadow-md"
      >
        <WifiOff aria-hidden className="h-3.5 w-3.5" />
        Offline — orders can’t be placed until you reconnect
      </p>
    </div>
  );
}
