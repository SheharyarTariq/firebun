"use client";

import { useEffect } from "react";

/** Registers the app-shell service worker (production only; dev would cache stale builds). */
export default function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error) => {
      console.warn("[sw] registration failed", error);
    });
  }, []);
  return null;
}
