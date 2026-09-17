---
name: web-api-patterns
description: >
  Defines how this project reads and writes data. There is NO external REST API: the app is
  full-stack Next.js talking to Postgres through Drizzle. Reads happen in Server Components via
  `server/<feature>/queries.ts`; writes happen in Server Actions (`app/.../actions.ts`) that call
  `server/<feature>/service.ts`; the only Route Handlers are for things that need a URL (receipt
  bytes, CSV export). Use this skill whenever you fetch data, add a form or button that changes
  data, add an endpoint, call the database, or do anything involving HTTP requests. It is the
  source of truth for route strings, auth guards, validation, transactions, revalidation and the
  `ActionResult` contract.
---

# Data access & mutations

```
Server Component (page.tsx)      Client Component ('use client')
        │                                  │  calls
        ▼                                  ▼
server/<feature>/queries.ts      app/(app)/<feature>/actions.ts  ('use server')
        │                                  │  calls
        │                                  ▼
        │                        server/<feature>/service.ts   (business rules, transactions)
        ▼                                  ▼
                     db/index.ts  →  getDb()  →  Postgres (Supabase)
```

Never `fetch`/`axios` the app's own routes from components, and never import `db/` from a
`'use client'` file.

---

## 1. Route strings — `utils/routes/index.ts`

All paths live in the `routes` object. Nothing else hard-codes a path.

```typescript
export const routes = {
  ui: {
    pos: "/pos",
    orderDetails: (id: string | number) => `/orders/${id}`,   // always start with "/"
  },
  api: {
    orderReceipt: (id: string | number) => `/api/orders/${id}/receipt`, // Route Handlers only
  },
};
```

Use `routes.ui.*` in `<Link href>`, `router.push()` and `redirect()`.

---

## 2. Reads — Server Components + `server/<feature>/queries.ts`

- Pages and layouts are Server Components. They call query functions, never the DB directly.
- Query files start with `import "server-only"` and get the client via `getDb()` from `@/db`.
- Auth is checked at the top of the page/action with the DAL (`@/server/auth/dal`):
  `verifySession()` (any signed-in user), `getCurrentUser()` (user row) or `requireAdmin()`.
  The `(admin)` layout already calls `requireAdmin()`, but Server Actions must call it again.
- Wrap per-request reads that several components share in React `cache()`.
- Filters come from `searchParams` (a Promise in Next 16): `const { from } = await searchParams`.
- Money and quantity columns use `numeric(..., { mode: "number" })`, so they arrive as numbers.

```typescript
// server/inventory/queries.ts
import "server-only";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { inventoryItems } from "@/db/schema";

export async function listInventoryItems() {
  return getDb().query.inventoryItems.findMany({
    where: eq(inventoryItems.isActive, true),
    orderBy: [asc(inventoryItems.name)],
  });
}
```

```tsx
// app/(app)/(admin)/inventory/page.tsx
import { listInventoryItems } from "@/server/inventory/queries";
import InventoryList from "@/components/inventory";

export default async function InventoryPage() {
  const items = await listInventoryItems();
  return <InventoryList items={items} />;
}
```

---

## 3. Writes — Server Actions + `server/<feature>/service.ts`

Actions live in `app/(app)/<feature>/actions.ts` with `"use server"` at the top. Every action:

1. **Guards** first: `const user = await requireAdmin()` or `await getCurrentUser()`.
2. **Parses** its input (plain object argument or `FormData`) and **validates with yup** using
   `validateForm(schema, values)` from `@/utils/validation` — the same `schema.ts` the client uses.
3. **Calls the service**, which owns the business rules and the transaction.
4. **Revalidates** the affected pages with `revalidatePath(routes.ui.x)`.
5. **Returns `ActionResult<T>`** from `@/utils/action-result` — never throws for expected failures.
   `redirect()` (if needed) is called outside any `try/catch` because it throws internally.

```typescript
// app/(app)/(admin)/inventory/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { inventoryItemSchema } from "@/components/inventory/schema";
import { createInventoryItem } from "@/server/inventory/service";
import { requireAdmin } from "@/server/auth/dal";
import { isServiceError } from "@/server/errors";
import { fail, ok, type ActionResult } from "@/utils/action-result";
import { routes } from "@/utils/routes";
import { validateForm } from "@/utils/validation";

export async function createInventoryItemAction(
  input: { name: string; baseUnit: string; lowStockThreshold?: number }
): Promise<ActionResult<{ id: number }>> {
  const user = await requireAdmin();

  const fieldErrors = await validateForm(inventoryItemSchema, input);
  if (Object.keys(fieldErrors).length) return fail("Please fix the highlighted fields", fieldErrors);

  try {
    const item = await createInventoryItem(input, user.id);
    revalidatePath(routes.ui.inventory);
    return ok({ id: item.id });
  } catch (error) {
    if (isServiceError(error)) return fail(error.message, error.fieldErrors);
    throw error; // unexpected — let Next report it
  }
}
```

Services (`server/<feature>/service.ts`, `import "server-only"`):

- Accept `DbOrTx` when they may run inside a caller's transaction; otherwise use `getDb()`.
- Multi-table writes go in **one** `db.transaction(async (tx) => { ... })`.
- Throw `ServiceError("human readable message")` from `@/server/errors` for domain failures.
- Never trust client prices/quantities: re-read them from the DB inside the transaction.
- Every insert records `createdBy` from the guard's user id.

### Calling an action from a Client Component

```tsx
"use client";
import { useTransition } from "react";
import toast from "react-hot-toast";
import { createInventoryItemAction } from "@/app/(app)/(admin)/inventory/actions";

const [isPending, startTransition] = useTransition();

const handleSubmit = async () => {
  if (!(await validateAndSetErrors(inventoryItemSchema, values, setErrors))) return;
  startTransition(async () => {
    const result = await createInventoryItemAction(values);
    if (!result.ok) {
      if (result.fieldErrors) setErrors(result.fieldErrors);
      toast.error(result.error);
      return;
    }
    toast.success("Item added");
    setOpen(false);
  });
};
```

For plain `<form action={...}>` submissions (sign-in, sign-out) use `useActionState` and the
`(prevState, formData)` signature — see `components/auth/sign-in`.

---

## 4. Route Handlers — only when a URL is required

`app/api/**/route.ts` exists only for responses that must be fetched by URL: ESC/POS receipt
bytes for the printer bridge, CSV exports. Rules:

- First line: `const session = await getSession()`; return `401` when null, `403` for role.
- `params` is a Promise: `const { id } = await ctx.params`.
- Return a standard `Response` (`new Response(bytes, { headers })`).
- The proxy skips `/api/*`, so the handler is the only guard.

---

## 5. Checklist for a new feature

1. Schema in `db/schema/<feature>.ts` (+ `db/schema/index.ts` export) → `npm run db:generate` → `npm run db:migrate`.
2. `server/<feature>/queries.ts` and `service.ts` (`server-only`).
3. yup schema in `components/<feature>/schema.ts`.
4. Server Actions in `app/(app)/<feature>/actions.ts` (guard → validate → service → revalidate → `ActionResult`).
5. Page in `app/(app)/<feature>/page.tsx` reading via queries; UI in `components/<feature>/`.
6. Paths in `routes.ui`.
