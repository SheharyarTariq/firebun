/*
 * Fire Bun app shell. Keeps the built JS/CSS, icons and an offline page cached so the app
 * opens instantly and shows something useful without a connection. Everything that needs
 * the database (pages, Server Actions, /api) always goes to the network.
 */
const VERSION = "v1";
const SHELL_CACHE = `firebun-shell-${VERSION}`;
// The offline page and the files it needs live apart, so trimming the runtime cache never evicts them.
const OFFLINE_CACHE = `firebun-offline-${VERSION}`;
const OFFLINE_URL = "/offline";
// Every deploy ships new hashed files; without a cap the old ones would pile up on the phone.
const MAX_RUNTIME_ENTRIES = 80;
const PRECACHE = [OFFLINE_URL, "/manifest.webmanifest", "/assets/icon-192.png", "/assets/icon-512.png"];

/**
 * The offline page is server-rendered HTML that React still hydrates in the browser, so the
 * scripts and styles it links to must be cached too, or it falls into the error screen exactly
 * when it is needed. They are read out of its own HTML so this never needs updating per build.
 */
async function precacheOfflinePage(cache) {
  const response = await fetch(OFFLINE_URL, { cache: "no-store" });
  const html = await response.clone().text();
  await cache.put(OFFLINE_URL, response);
  const assets = new Set([...html.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+)"/g)].map((m) => m[1]));
  await Promise.all([...assets].map((asset) => cache.add(asset).catch(() => {})));
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    Promise.all([caches.open(OFFLINE_CACHE), caches.open(SHELL_CACHE)])
      .then(([offline, shell]) => Promise.all([precacheOfflinePage(offline), shell.addAll(PRECACHE.filter((u) => u !== OFFLINE_URL))]))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL_CACHE && k !== OFFLINE_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const isStaticAsset = (url) =>
  url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/assets/") || url.pathname === "/manifest.webmanifest";

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  // Hashed build files and icons: cache first, they never change under the same name.
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(SHELL_CACHE).then(async (cache) => {
                await cache.put(request, copy);
                // Keep the precached shell; drop the oldest runtime files beyond the cap.
                const keys = (await cache.keys()).filter((k) => !PRECACHE.includes(new URL(k.url).pathname));
                await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_RUNTIME_ENTRIES)).map((k) => cache.delete(k)));
              });
            }
            return response;
          })
      )
    );
    return;
  }

  // Screens: always fresh; when the network is gone, show the offline page.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL).then((r) => r || Response.error())));
  }
});
