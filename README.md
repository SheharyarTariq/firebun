# Fire Bun

Mobile-first point-of-sale, inventory and finance app for the Fire Bun fast-food shop.
Staff take orders and print bills on an Android phone; the admin manages inventory, the menu
(with recipes that deduct stock), expenses and finance reports.

- **Stack**: Next.js 16 (App Router, Server Actions), React 19, Tailwind CSS v4, Drizzle ORM on
  Supabase Postgres, ESC/POS receipts for 58 mm Bluetooth printers.
- **Roles**: `admin` (everything) and `staff` (counter, orders, expenses). No self-signup.

## Local setup

```bash
npm install
cp .env.example .env.local      # fill in the Supabase session-pooler URL, AUTH_SECRET, Supabase keys
npm run db:migrate              # apply drizzle/ migrations
npm run db:seed                 # first admin (admin@gmail.com / Admin@123), settings, menu, starting inventory
npm run dev                     # http://localhost:3000
```

Other commands: `npm run build`, `npm run lint`, `npm run typecheck`,
`npm run db:generate -- --name <change>` (new migration from `db/schema`), `npm run db:studio`.

## Environment variables

| Name | Purpose |
|---|---|
| `DATABASE_URL` | Supabase **session** pooler (port 5432). The transaction pooler stalls pipelined queries — see `db/pool.ts`. |
| `DIRECT_URL` | Optional; used by drizzle-kit (defaults to `DATABASE_URL`). |
| `AUTH_SECRET` | Signs the session cookie (`openssl rand -base64 32`). |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SECRET_KEY` | Supabase API keys, reserved for file storage. |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | Optional overrides for `npm run db:seed`. |

## Deploying (Vercel)

Import the repository in Vercel, add the environment variables above, and deploy. `vercel.json`
pins functions to Mumbai (`bom1`), next to the database. HTTPS is required for Bluetooth printing
and the installable PWA. Note that Vercel's Hobby plan does not allow commercial use.

## Printing

More → Printer on each phone chooses one of three transports: Bluetooth (Chrome, printers with
Bluetooth LE), the RawBT Android app (most Bluetooth thermal printers), or the phone's print dialog.
Receipts are built in `utils/printing/receipt.ts`; `GET /api/orders/[id]/receipt` serves the
JSON model or a 58 mm HTML page.

## Project conventions

See `CLAUDE.md` and the skills under `.claude/skills/` for the folder layout, data-access pattern
and coding standards.
