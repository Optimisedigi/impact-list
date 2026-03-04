Run the test suite for Impact List (Vitest, 320 tests across 19 files).

## Commands

- `npm test` — Run all tests once
- `npm run test:watch` — Run in watch mode (re-runs on file changes)
- `npm run test:coverage` — Run with V8 coverage report (covers src/lib/** and src/server/**)

## Filtering

Run a specific test file:
```
npx vitest run src/lib/__tests__/time-utils.test.ts
```

Run tests matching a pattern:
```
npx vitest run -t "csv-import"
```

Run a specific directory:
```
npx vitest run src/server/actions/__tests__/
npx vitest run src/server/queries/__tests__/
npx vitest run src/app/api/ai/__tests__/
```

## On Failure

If tests fail, spawn parallel agents to fix them — one agent per failing test file:
1. Each agent should read the failing test file AND its corresponding source file
2. Determine if the test expectations are stale or if the source code has a bug
3. Fix the issue (usually the mock chain doesn't match the source's query builder chain)
4. Re-run the specific test file to confirm
5. Run the full suite (`npm test`) to check for regressions

## Test Architecture

- **Framework**: Vitest 4 with jsdom environment
- **Pattern**: All DB calls mocked via chainable builder mocks (`db.select().from().where()...`)
- **Mocks**: `@/db`, `@/db/schema`, `drizzle-orm`, `next/cache` are mocked in every test
- **Location**: `__tests__/` directories alongside source files
