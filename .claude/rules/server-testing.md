---
paths:
  - 'apps/server/src/**/tests/**'
  - 'apps/server/src/test/**'
  - 'apps/server/vitest.config.mts'
  - 'apps/server/tsconfig.build.json'
---

# Testing

The monorepo-wide rules live in the root [`AGENTS.md`](../../AGENTS.md#testing) and
[ADR-0008](../../docs/adr/0008-vitest-unit-testing-with-an-enforced-coverage-gate.md). Backend specifics:

```bash
pnpm backend test              # vitest run
pnpm backend test:watch
pnpm backend test:coverage
```

- **One test file per source file, in a `tests/` folder beside it**: `chat.service.ts` is tested by
  `src/modules/chat/tests/chat.service.test.ts`. Never group several modules into one file.
- **`tsconfig.build.json` excludes `src/**/*.test.ts` and `src/**/tests/**`.** The build is
  `tsc && tsc-alias` over `src/**/*.ts`, so without those exclusions every test file compiles into
  `dist/` and ships in the production image. Do not remove them.
- **Route tests use `app.inject()`, never `supertest`.** Build the real app, mock only the repository:

  ```ts
  const app = await buildApp();
  const res = await app.inject({ method: 'GET', url: '/api/sessions' });
  expect(res.statusCode).toBe(200);
  ```

  This keeps routing, Zod validation, `error.handler.ts` and the `preHandler` hook chain under test. No
  socket is opened and no container is needed.

- **Mock at the nearest boundary to an external system, and nothing above it.** For a CRUD route that
  is the repository: `vi.mock` the `*.repository.ts` module and leave the service and controller real —
  mocking a service to test its own controller tests nothing. The send and stream routes also reach Redis
  and BullMQ, through `@server/redis` (`src/redis.ts`) and `@server/queue` (`src/queue.ts`), so their
  route tests fake those two modules in memory (`src/test/memoryReplyStreams.ts`, an array of enqueued
  jobs). The rule is the same one either way — fake the thing that would otherwise open a socket, keep
  everything between it and the HTTP boundary real — and the faked module gets its own unit test at its
  own seam (`src/tests/redis.test.ts`, `src/tests/queue.test.ts`; the lib's primitives are tested in
  `@nebula-chat/redis`).
- **No database, no Redis, no network.** The CI `DATABASE_URL` secret points at a shared database and is
  off-limits to tests.
- **Test each layer at its seam**: `.validation` (Zod schemas — accept and reject cases), `.service`
  (business logic with the repository mocked), and the route (via `app.inject()`). Cover the error paths
  too: validation failure, not-found, and rate-limited.
- **`AppError` mapping is a seam worth its own tests** — `errors/error.handler.ts` is what every route
  depends on for correct status codes.
