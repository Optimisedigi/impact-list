# Impact List

Impact List is a private Next.js task-management PWA for prioritising work by leverage/priority scores, tracking time, planning weekly priorities, and integrating calendar events.

## Stable structure

```text
src/
  app/                    # Next.js App Router pages, layouts, API routes, global CSS
    (dashboard)/          # Main app routes: focus, tasks, calendar, analytics, matrix, treemap, timeline, settings
    api/ai/               # AI task parsing and scoring endpoints
    api/calendar/         # Google, Apple/CalDAV, and sync endpoints
    api/external/v1/      # Bearer-token external calendar events API
  components/             # Shared layout, PWA, timer, and shadcn/Radix UI components
  db/                     # Drizzle schema, LibSQL client, seed/backfill scripts
  lib/                    # Shared utilities plus AI provider and calendar integration helpers
  server/actions/         # Server mutations for tasks, time, scoring, calendars, settings, recurring work
  server/queries/         # Server reads for tasks, analytics, calendars, timeline, growth phases
  test/                   # Vitest setup
  types/                  # Shared inferred/domain types
```

## Stack confirmed from config

- Next.js `16.1.6`, React `19.2.3`, TypeScript strict mode with `@/* -> src/*` alias.
- Tailwind CSS 4 with shadcn/ui `new-york` config, Radix UI, Lucide icons, Framer Motion, Recharts, TipTap.
- Drizzle ORM + `@libsql/client`; local Drizzle config targets SQLite at `file:./local.db`, Turso config reads `.env.local` for `TURSO_SYNC_URL` and `DATABASE_AUTH_TOKEN`.
- Vitest uses `jsdom`, Testing Library setup in `src/test/setup.ts`, and includes `src/**/*.test.{ts,tsx}`.
- Both `package-lock.json` and `pnpm-lock.yaml` exist; `package.json` does not declare a package manager.

## Project-specific notes

- Root route redirects to `/focus`; dashboard navigation is defined in `src/components/layout/sidebar.tsx`.
- Core domain tables in `src/db/schema.ts` include tasks, time entries, growth phases, business context, weekly priorities, clients, categories, category targets, recurring tasks, and calendar accounts/events/profiles/subscriptions.
- `src/db/index.ts` uses `TURSO_SYNC_URL` to switch from local `file:./local.db` to an offline libSQL replica at `file:./local-replica.db` with periodic sync.
- Public PWA assets live in `public/manifest.json` and `public/sw.js`; the root layout registers the service worker.
- `*.sync-conflict-*`, `.next/`, local SQLite files, and lock/runtime artifacts are not stable project structure.

## Local commands from `package.json`

```bash
npm run dev            # next dev
npm run build          # next build
npm run start          # next start
npm run lint           # eslint
npm run db:seed        # tsx src/db/seed.ts
npm run db:push        # drizzle-kit push using drizzle.config.ts
npm run test           # vitest run
npm run test:watch     # vitest
npm run test:coverage  # vitest run --coverage
```

## Dev server workflow

Use port 3111 for the local dev server. The project is managed by PM2 as `impact-list`:

```bash
pm2 list
pm2 logs impact-list
pm2 restart impact-list
```
