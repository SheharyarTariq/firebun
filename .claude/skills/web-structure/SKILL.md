---
name: web-structure
description: >
  Defines the canonical folder and file structure for this full-stack Next.js 16 project
  (Fire Bun POS / inventory / finance). Use this skill whenever you are creating new pages,
  components, server modules, schema files, utilities, or any new directory/file. Trigger on
  requests like "add a new page", "create a component", "add a new feature", "scaffold X module",
  or any time a new file needs to be placed somewhere in the project. This skill is the source
  of truth for where things go and how they are named.
---

# Project Structure

## Top-Level Layout

```
project-root/
├── app/                      # Next.js App Router — pages, layouts, Server Actions, Route Handlers
├── components/               # All React UI components
├── server/                   # Server-only modules: auth DAL, per-feature queries + services
├── db/                       # Drizzle schema, client, seed
│   ├── index.ts              # getDb() — lazy postgres.js + Drizzle client
│   ├── schema/               # One file per domain, re-exported from index.ts
│   ├── seed.ts               # npm run db:seed (admin user, settings, menu)
│   └── seed-data/            # Static seed data (the printed menu)
├── drizzle/                  # Generated SQL migrations (commit them)
├── utils/                    # Pure helpers shared by client and server
├── public/assets/            # Static assets (PWA icons, images)
├── proxy.ts                  # Optimistic auth redirect (Next 16 name for middleware)
├── config.ts                 # Public config (app name, timezone, NEXT_PUBLIC_* only)
├── drizzle.config.ts
├── next.config.ts
├── tsconfig.json
├── .env.example              # Documented env vars; copy to .env.local (never committed)
└── docs/raw/                 # Menu photos and other source material
```

Application code lives at the repository root — there is no `src/` directory. The `@/*` alias maps to `./*`.

---

## `app/` — Pages, Layouts, Actions, Route Handlers

Only `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `actions.ts` and `api/**/route.ts`
live here. No business logic, no reusable components.

```
app/
├── layout.tsx                    # Root layout: fonts, metadata, viewport, <Toaster />
├── globals.css                   # Tailwind v4 + design tokens
├── manifest.ts                   # PWA manifest
├── icon.svg                      # Favicon
├── page.tsx                      # "/" → redirects to /pos
├── actions.ts                    # Global server actions (signOutAction)
├── auth/
│   ├── sign-in/{page.tsx,actions.ts}
│   └── sign-out/route.ts         # Clears the session cookie
├── (app)/                        # Signed-in shell: bottom nav, getCurrentUser()
│   ├── layout.tsx
│   ├── loading.tsx
│   ├── pos/{page.tsx,actions.ts}
│   ├── orders/{page.tsx,actions.ts}
│   │   └── [order-id]/page.tsx
│   ├── expenses/{page.tsx,actions.ts}
│   ├── more/page.tsx
│   └── (admin)/                  # requireAdmin() in layout.tsx; URLs have no "/admin" prefix
│       ├── layout.tsx
│       ├── inventory/{page.tsx,actions.ts}
│       │   └── [item-id]/page.tsx
│       ├── menu/{page.tsx,actions.ts}
│       │   └── [item-id]/page.tsx
│       ├── finance/page.tsx
│       ├── users/{page.tsx,actions.ts}
│       └── settings/{page.tsx,actions.ts}
└── api/
    └── orders/[id]/receipt/route.ts   # Only Route Handler: receipt bytes for the printer
```

**Naming rules**
- Route groups use parentheses: `(app)`, `(admin)`.
- Dynamic segments use brackets with kebab-case: `[order-id]`, `[item-id]`.
- Feature folders are plural where natural: `orders`, `expenses`, `users`.
- Each feature's Server Actions sit next to its page in `actions.ts`.

---

## `components/` — UI

```
components/
├── <feature>/                    # pos/, orders/, inventory/, menu/, expenses/, finance/, settings/, users/
│   ├── index.tsx                 # Main entry component (list / screen container)
│   ├── schema.ts                 # yup schemas for this feature's forms
│   └── <sub-component>/index.tsx # e.g. inventory/purchase-sheet/index.tsx
├── auth/
│   ├── sign-in/index.tsx
│   └── schema.ts
├── layout/
│   ├── bottom-nav/index.tsx      # Role-aware tab bar (client)
│   └── page-header/index.tsx     # Sticky dark header with optional BackArrow / actions
└── common/                       # Domain-agnostic primitives (PascalCase folders)
    ├── Button/  Input/  Textarea/  Select/  NumberStepper/
    ├── BottomSheet/  ConfirmSheet/          # vaul drawers for pickers, forms, confirmations
    ├── Badge/  Card/  Loader/  EmptyState/  BackArrow/
```

- Every component lives in its own folder with an `index.tsx`.
- Feature folders and sub-components are kebab-case; common components are PascalCase.
- `schema.ts` lives inside the feature folder, never in a global schemas directory.

---

## `server/` — server-only code

```
server/
├── env.ts                        # Lazy, validated secrets (DATABASE_URL, AUTH_SECRET)
├── errors.ts                     # ServiceError for expected domain failures
├── auth/
│   ├── constants.ts  jwt.ts      # Cookie name, jose sign/verify (proxy-safe, no Next imports)
│   ├── session.ts                # createSession / deleteSession (cookies)
│   ├── password.ts               # bcryptjs hash / verify
│   └── dal.ts                    # getSession, verifySession, getCurrentUser, requireAdmin
└── <feature>/
    ├── queries.ts                # Read functions used by pages
    └── service.ts                # Business rules + transactions used by actions
```

Every file under `server/` (except `jwt.ts`, `password.ts`, `constants.ts`, which the proxy and
the seed script import) starts with `import "server-only"`.

---

## `db/schema/` — one file per domain

`_columns.ts` (shared builders: `id()`, `money()`, `quantity()`, `unitCost()`, timestamps),
`users.ts`, `settings.ts`, `inventory.ts`, `menu.ts`, `orders.ts`, `expenses.ts`, `relations.ts`,
`index.ts` (re-exports everything). Column keys are camelCase in TypeScript and snake_case in
Postgres (`casing: "snake_case"`). Enum-like columns are `text({ enum: [...] })` plus a CHECK.

---

## `utils/` — pure helpers (client + server safe)

```
utils/
├── cn.ts                 # clsx + tailwind-merge
├── routes/index.ts       # All UI paths and the few API paths
├── helper/index.ts       # formatMoney, formatDateTime, businessDateFor, unit conversions
├── validation/index.ts   # validateForm / validateAndSetErrors (yup)
└── action-result.ts      # ActionResult<T>, ok(), fail()
```

Never import `db/`, `server/` or `next/headers` from `utils/`.

---

## Key Conventions

1. **Feature = folder.** A new domain feature `<feature>` needs:
   - `db/schema/<feature>.ts` + migration (`npm run db:generate && npm run db:migrate`)
   - `server/<feature>/queries.ts` and `service.ts`
   - `components/<feature>/index.tsx` (+ `schema.ts` if it has forms)
   - `app/(app)/<feature>/page.tsx` and `actions.ts` (under `(admin)` if admin-only)
   - paths in `utils/routes/index.ts`
2. **Path alias** — always `@/`, never relative imports that climb more than one level.
3. **Env** — `config.ts` for public values, `server/env.ts` for secrets; never `process.env` elsewhere.
4. **Static assets** go in `public/assets/` and are referenced as `/assets/<file>`.
