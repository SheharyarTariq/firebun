# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What this is

**Fire Bun** — a mobile-first web app for a single-branch fast-food shop in Pakistan (PKR).
Staff take orders and print bills on an Android phone; the admin manages inventory, the menu
(with recipes that deduct inventory), expenses and finance reports. The full design, data model,
business rules and phased build plan are in `~/.claude/plans/i-want-to-create-compressed-mccarthy.md`
(approved 2026-09-16). Phases: 0 Foundation ✅ · 1 Inventory ✅ · 2 Menu & recipes ✅ · 3 POS & orders ✅ ·
4 Printing ✅ (G3 prints over Web Bluetooth; live at https://firebun.vercel.app) · 5 Expenses & finance ✅ ·
6 Hardening (staff accounts, change password and shop settings already done; remaining: item images,
nightly DB dump, public menu page).

## Critical: Next.js 16 — verify APIs against bundled docs

This project runs **Next.js 16.2.7** (App Router) on **React 19.2** and **Tailwind CSS v4**. These are newer than typical training data, and Next.js 16 ships breaking changes. Before writing or changing framework code, read the relevant guide in `node_modules/next/dist/docs/` rather than relying on memorized APIs. Useful entry points:

- `node_modules/next/dist/docs/01-app/01-getting-started/` — App Router fundamentals (`07-mutating-data.md`, `16-proxy.md`)
- `node_modules/next/dist/docs/01-app/03-api-reference/` — exact current API signatures
- `node_modules/next/dist/docs/01-app/02-guides/` — task-oriented guides (`authentication.md`, `progressive-web-apps.md`)

Already-verified facts: `proxy.ts` replaces `middleware.ts` (Node runtime); `cookies()`, `params`,
`searchParams` are Promises; Server Actions use `'use server'` files; `app/manifest.ts` serves the
PWA manifest; `cacheComponents` stays off.

## Commands

```bash
npm run dev          # dev server at http://localhost:3000
npm run build        # production build
npm run start        # serve the production build
npm run lint         # ESLint (flat config)
npm run typecheck    # tsc --noEmit
npm run db:generate -- --name <change>   # drizzle-kit: write drizzle/NNNN_<change>.sql from db/schema (always pass --name)
npm run db:migrate   # apply migrations (needs DIRECT_URL / DATABASE_URL in .env.local)
npm run db:seed      # first admin (admin@gmail.com / Admin@123 unless SEED_ADMIN_* set), settings row, printed menu
npm run db:studio    # Drizzle Studio
```

Migrations are numbered sequentially (`0000_init.sql`, `0001_…`, …) and committed. Claude runs
generate/migrate/seed itself; never hand SQL to the user.

There is no test runner. Verification = typecheck + lint + build + walking through the app.

## Stack

- **Data**: Supabase Postgres via Drizzle ORM + postgres.js (`db/index.ts` → `getDb()`, lazy,
  `casing: "snake_case"`). `DATABASE_URL` must be the **session pooler (port 5432)**: the
  transaction pooler (6543) stalls connections when postgres.js pipelines queries (pages hang
  with no error) and its `max_pipeline: 0` workaround breaks transactions. Pool options live in
  `db/pool.ts` (`max: 3`); bump `POOL_VERSION` when they change. Schema in `db/schema/*`,
  migrations in `drizzle/`.
- **Auth**: email + password (`bcryptjs`), `jose` HS256 JWT in an httpOnly cookie (`fb_session`,
  30 days). `proxy.ts` does the optimistic redirect; `server/auth/dal.ts` (`verifySession`,
  `getCurrentUser`, `requireAdmin`) is the real guard used by pages and every Server Action.
  Roles: `admin` (everything) and `staff` (counter, orders, expenses). No self-signup: admins create
  accounts at `/users`; everyone can change their own password from More.
- **Reads/writes**: Server Components → `server/<feature>/queries.ts`; Client → Server Actions in
  `app/.../actions.ts` → `server/<feature>/service.ts`, wrapped with `validatedAction`/`runAction`
  from `server/run-action.ts`. See the `web-api-patterns` skill.
- **Inventory ledger**: `server/inventory/service.ts#applyMovement` is the only way stock changes
  (orders will call it too). `recomputeItem` replays the ledger after a voided purchase.
  Quantities can be typed in display units or in the item's optional pack (`pack_size` in base
  units + `pack_label`); helpers `entryUnitOptions` / `entryQtyToBase` in `utils/helper`. There is
  no "opening stock" form: starting stock is entered with Count (no cost) or Purchase.
- **Menu**: `server/menu/service.ts` owns categories (reorder renumbers 0..n-1), items (slug
  auto-unique), variants (≥1 active size; delete blocked when used in orders/deals), recipes
  (upsert per variant+ingredient, `copyRecipe` between sizes) and deal slots/options (single-kind
  variants only). `setItemAvailability` is the sold-out toggle staff will also use from the POS.
- **Orders**: `server/orders/service.ts#placeOrder` is one transaction: idempotent by `clientId`,
  re-prices from the DB, enforces the staff discount cap, expands deal slot choices into child
  lines (price 0), numbers per business day via `daily_counters`, and deducts stock with
  `applyMovement("sale", unitCost: "current")`. Counter orders are `completed`; delivery with
  "pay on delivery" is `pending` until `markOrderPaid`. `cancelOrder` optionally restocks with
  `sale_reversal` rows; `cancelDenialReason` holds the staff/admin rule (also used by the page).
- **Printing**: `utils/printing/receipt.ts` is pure (model → ESC/POS via
  `@point-of-sale/receipt-printer-encoder` v4, and → HTML for the print dialog); ASCII only
  (`toAscii`), 32 columns, plain-dash rules. `GET /api/orders/[id]/receipt?format=json|html`
  (`id` may be `sample`) is the only receipt endpoint and checks the session itself. Transports
  live in `utils/printing/adapters/` (Web Bluetooth via the vendored MIT file in
  `utils/printing/vendor/` — the npm package only exports a `browser` condition and breaks the
  SSR graph —, RawBT `intent:` URL, hidden-iframe print dialog); the per-phone choice is in
  localStorage (`utils/printing/prefs.ts`); `components/printing/use-printer.ts` is the hook.
  Auto-print runs inside the "Place order" tap's activation window so intents/Bluetooth are allowed.
- **Expenses & finance**: `server/expenses/service.ts` (staff may add when `staffCanAddExpenses`,
  only admins edit/delete; staff see only their own rows), `server/finance/queries.ts#getFinanceReport`
  (cash basis over inclusive business-date ranges: income from completed orders, spend = non-voided
  purchases + expenses, pending COD shown separately, ingredient cost from `sale` movement cost
  snapshots, top sellers from parent lines only). Period presets live in `utils/helper`
  (`rangeForPreset`, `PeriodPicker` component). CSV export: `GET /api/finance/export` (admin).
- **Cart**: `components/pos/cart-store.ts` (zustand, persisted to `sessionStorage`, one
  `clientId` per cart). Render cart-dependent UI only after `useHydrated()` is true.
- **Lint rules to respect**: no `setState` inside effects; no `Date.now()`/impure calls during
  render (compute on the server or in handlers).
- **Sheets with forms**: initialise state once; the parent remounts the sheet with a new `key` on
  each open.
- **Dev server**: only one `next dev` per folder (Next 16 refuses a second); check pages against the
  running one with a forged `fb_session` JWT (`jose`, `AUTH_SECRET`, sub = user id, tv = 0).
- **UI**: Tailwind v4 tokens in `app/globals.css`, hand-built primitives in `components/common`,
  `vaul` bottom sheets, `lucide-react` icons, `react-hot-toast`. See `web-best-practices`.
- **Dates/money**: helpers in `utils/helper` (Asia/Karachi via `@date-fns/tz`, PKR formatting,
  unit conversion, `businessDateFor`).
- **PWA**: `app/manifest.ts` + icons in `public/assets`; no service worker yet.

## Environment

`.env.local` (see `.env.example`): `DATABASE_URL` (session pooler 5432), optional `DIRECT_URL`,
`AUTH_SECRET`, optional `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`, and the `NEXT_PUBLIC_SUPABASE_*`
keys for later Storage use. Public config lives in `config.ts`; secrets are read lazily in
`server/env.ts`. `npm run db:seed` also seeds the shop's 27 starting inventory items
(`db/seed-data/inventory.ts`) with one pack each as opening stock.

## Conventions worth knowing

- Money `numeric(12,2)`, quantities `numeric(14,3)`, unit costs `numeric(14,6)`, all `mode: "number"`.
- Enum-like columns are `text({ enum })` + CHECK constraints, not Postgres enums.
- Stock is a ledger (`stock_movements`); `inventory_items.current_qty` is a cached sum updated in
  the same transaction. Never block a sale on stock; warn instead.
- Every menu item has ≥1 variant; price and recipe live on the variant. Deals are items of kind
  `deal` whose variant owns `deal_slots` → `deal_slot_options`.
- Orders carry `business_date` (shop time minus the cutoff hour) and a per-day `daily_seq`; a
  client-generated `client_id` makes placement idempotent.
- The `(admin)` route group has no URL prefix: `/inventory`, `/menu`, `/finance`, `/users`, `/settings`.
