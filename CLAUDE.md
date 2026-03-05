# Impact List

AI-powered task management app that helps prioritize work by calculating leverage scores, tracking time, and surfacing high-impact tasks.

## Project Structure

```
src/
  app/
    (dashboard)/
      analytics/        # Analytics charts and stats
      focus/            # Focus mode view
      matrix/           # Priority matrix (Eisenhower)
      settings/         # Category, client, recurring task config
      tasks/            # Task list page + [id] detail page
      treemap/          # Treemap visualization
      layout.tsx        # Dashboard shell + timer + sidebar providers
    api/ai/             # AI endpoints (parse-task, score)
    globals.css         # Global styles + OKLCH color system
    layout.tsx          # Root layout (fonts, tooltip provider)
  components/
    layout/             # Dashboard shell, sidebar, floating add button
    timer/              # Task timer context + floating widget
    ui/                 # shadcn components (button, input, select, etc.)
  db/
    schema.ts           # Drizzle ORM schema (tasks, timeEntries, clients, categories, etc.)
    index.ts            # DB client (LibSQL/SQLite)
  lib/
    constants.ts        # Categories, statuses, nav items, builder helpers
    time-utils.ts       # Date formatting, deadline calculation
    utils.ts            # cn() helper
  server/
    actions/            # Server mutations (tasks, time-entries, clients, AI scoring, CSV import)
    queries/            # Server reads (tasks, time-entries, analytics)
  types/
    index.ts            # Inferred Drizzle types (Task, TimeEntry, Client, etc.)
```

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack) + React 19
- **Language**: TypeScript (strict)
- **Database**: SQLite via LibSQL + Drizzle ORM
- **Styling**: Tailwind CSS 4 + shadcn/ui (new-york style)
- **Rich Text**: TipTap
- **Testing**: Vitest + Testing Library
- **Icons**: Lucide React

## Organization Rules

- Server mutations go in `src/server/actions/`, one file per domain
- Server reads go in `src/server/queries/`, one file per domain
- Page components go in `src/app/(dashboard)/[route]/components/`
- Shared UI components go in `src/components/ui/`
- Types are inferred from Drizzle schema in `src/types/index.ts`
- Constants and helper builders go in `src/lib/constants.ts`
- Always use `revalidatePath` in server actions for affected routes
- Use `useOptimistic` + `useTransition` pattern for inline editing

## Code Quality

After editing ANY file, run:

```bash
npm run lint
npx tsc --noEmit
```

Fix ALL errors and warnings before continuing.

To run tests:

```bash
npm run test
```

## Dev Server

**Always use port 3111. Never start the dev server on any other port.**

Managed by PM2:

```bash
pm2 list                    # Check status
pm2 logs impact-list        # View logs
pm2 restart impact-list     # Restart
```
