---
name: web-best-practices
description: >
  Defines the coding standards for this project's UI and code: Tailwind v4 with the Fire Bun
  design tokens, the common component set, mobile-first rules for a phone-based POS, yup forms
  wired to Server Actions, TypeScript rules, and Server vs Client Component patterns. Use this
  skill whenever you write any new code — components, forms, pages, server modules, utilities.
  Trigger on "add a form", "create a component", "build a page", "add a field", "write a
  feature", or any coding task. Consult it before writing any component, form or utility.
---

# Coding Best Practices

---

## 1. Tailwind v4 + design tokens

All styling is Tailwind utility classes composed with `cn()` from `@/utils/cn`. No inline
`style={{}}`, no custom CSS unless Tailwind genuinely cannot express it.

Tokens are declared in `app/globals.css` (`@theme inline`) and used by name:

| Purpose | Utilities |
|---|---|
| Page / card surfaces | `bg-background`, `bg-surface`, `bg-surface-2`, `border-border` |
| Text | `text-foreground`, `text-muted` |
| Brand (yellow / orange) | `bg-brand`, `bg-brand-strong`, `text-brand-strong`, `text-brand-ink` |
| Dark header / secondary button | `bg-ink`, `text-ink-foreground`, `text-ink-muted` |
| Status | `text-danger`/`bg-danger-bg`, `success`, `warning`, `info` |
| Radii | `rounded-field` (inputs, buttons), `rounded-card` (cards, sheets) |
| Safe areas | `pb-safe`, `pt-safe` |

```tsx
<div className={cn("rounded-card border border-border bg-surface p-4", isNeeded && "border-warning", className)} />
```

Never hard-code hex colours in components; add a token if one is missing.

---

## 2. Mobile-first rules (the app runs on Android phones at a counter)

- Touch targets are at least 44px: buttons `h-11`/`h-12`, list rows `py-3.5`, nav `h-[4.25rem]`.
- Inputs use `text-base` (16px) so the browser does not zoom on focus.
- Money and quantity fields: `inputMode="decimal"` (or `"numeric"`), never rely on `type="number"` spinners.
- No hover-only affordances; use `active:` states for feedback.
- Lists render as cards/rows, not tables. Horizontal category chips scroll with `overflow-x-auto`.
- Pickers, forms and confirmations open in `BottomSheet` / `ConfirmSheet`, not centred modals.
- Primary actions sit at the bottom of the screen or sheet, within thumb reach.
- Every screen starts with `<PageHeader title=… />`; content gets `p-4` and `space-y-4`.

---

## 3. Common components — use them, never re-implement

| Component | Import | Notes |
|---|---|---|
| `Button` | `@/components/common/Button` | `variant`: primary · secondary · outline · ghost · danger; `size`: sm · md · lg; `isLoading`, `startIcon` |
| `Input`, `Textarea` | `…/Input`, `…/Textarea` | `label`, `error`, `hint`, `startIcon`, `endIcon` |
| `Select` | `…/Select` | native select, `options: { value, label }[]`, `placeholder` |
| `NumberStepper` | `…/NumberStepper` | −/+ quantity, `min`/`max`/`step` |
| `BottomSheet` | `…/BottomSheet` | `open`, `onOpenChange`, `title`, `description`, `footer` |
| `ConfirmSheet` | `…/ConfirmSheet` | confirm/cancel with `destructive`, `isLoading`, optional children |
| `Badge` | `…/Badge` | `variant`: neutral · brand · success · warning · danger · info |
| `Card`, `Loader`, `EmptyState`, `BackArrow` | `…/Card` etc. | `EmptyState` takes a lucide `icon` |
| `PageHeader` | `@/components/layout/page-header` | `title`, `subtitle`, `backHref`, `actions` |

Raw `<button>`, `<input>`, `<select>`, `<textarea>` are only allowed inside `components/common`.
If a UI element is used in two places, extract it into `components/common/` first.

### Contract for a new common component

1. `components/common/MyComponent/index.tsx`
2. Props `interface` extending the matching HTML attributes
3. Accept `className`, merge with `cn()`, spread `...props`
4. Form fields support `label`, `error` (renders `<p className="mt-1 text-xs text-danger">` and `border-danger`), `hint`

---

## 4. Forms — yup on the client, yup again in the Server Action

Every feature with forms has `components/<feature>/schema.ts`:

```typescript
import * as yup from "yup";

export const purchaseSchema = yup.object({
  quantity: yup.number().typeError("Enter a number").positive("Must be more than 0").required("Quantity is required"),
  unitCost: yup.number().typeError("Enter a number").min(0).required("Cost is required"),
});
```

Component pattern (controlled `useState` fields, no form library):

```tsx
const [errors, setErrors] = useState<Record<string, string>>({});
const [isPending, startTransition] = useTransition();

const handleSubmit = async () => {
  if (!(await validateAndSetErrors(purchaseSchema, values, setErrors))) return;
  startTransition(async () => {
    const result = await addPurchaseAction(values);      // Server Action
    if (!result.ok) { if (result.fieldErrors) setErrors(result.fieldErrors); toast.error(result.error); return; }
    toast.success("Purchase recorded");
  });
};
```

- Clear a field's error as soon as the user edits it: `if (errors.qty) setErrors(p => ({ ...p, qty: "" }))`.
- Fields are grouped in `<div className="space-y-4">`; the submit `Button` is `size="lg"` and full width in sheets.
- The action re-validates with `validateForm` and returns `fail(message, fieldErrors)` — the client trusts nothing else.

---

## 5. Server vs Client Components

- **Server Components** (no directive): pages, layouts, anything that reads data. They call
  `server/<feature>/queries.ts` and pass plain data down as props.
- **`'use client'`**: anything with state, effects, event handlers, browser APIs, or that calls a
  Server Action. Keep client components small and leaf-level; pass data in, actions out.
- Never pass functions/components from Server to Client Components (only serialisable props).
  `EmptyState`'s `icon` is fine because `EmptyState` itself is a Server Component.
- Auth guards (`verifySession`, `getCurrentUser`, `requireAdmin`) run in pages and actions, not in
  client code. Role-based UI (hide admin buttons) is a convenience, not security.
- Loading states use `<Loader />`; feedback uses `react-hot-toast` (`toast.success/error`).
- Icons come from `lucide-react` only.

---

## 6. TypeScript

- Props as `interface`, not `type` (unless a union/intersection is needed).
- Derive row types from Drizzle: `typeof orders.$inferSelect` (already exported as `Order`, etc.).
- No `any`; use `unknown` and narrow.
- Money is `number` (rupees with 2 decimals), quantities are `number` in base units; format with
  `formatMoney` / `formatQty` from `@/utils/helper` only at render time.
- Dates: store `timestamptz`; format with the helpers (Asia/Karachi) — never `toLocaleString()` alone.
