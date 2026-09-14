# M-9 — Testing Stack (Vitest, monorepo-wide)

## Ticket metadata

| Field          | Value                                                                           |
| -------------- | ------------------------------------------------------------------------------- |
| **ID**         | M-9                                                                             |
| **Scope**      | `apps/nebula-chat-server`, `apps/nebula-chat-client`, `libs/*`, CI, conventions |
| **Depends on** | M-1 (Fastify — route tests run against the real `buildApp()`)                   |
| **Blocks**     | Nothing mechanically; every later ticket is expected to ship tests              |
| **Standalone** | Yes                                                                             |
| **ADR**        | [ADR-0008](../adr/0008-vitest-unit-testing-with-an-enforced-coverage-gate.md)   |

> **This ticket was rewritten on 2026-09-14.** Its original spec predated M-1 and M-5 and was wrong in five concrete ways: it referenced a `CI-1` workflow that does not exist, used `apps/server` paths (the real path is `apps/nebula-chat-server`), prescribed `supertest` (Fastify has `app.inject()` built in), mandated testcontainers and autocannon, and scoped testing to the server only — while the highest-value test target in the repo, the token budget, lives in `libs/langchain`. ADR-0008 records the reasoning; **the spec below is authoritative**.

## Objective

Stand up Vitest as the single test runner across every package, co-located as `src/**/*.test.ts(x)`, wired into `turbo` and the existing CI build matrix, and enforce **80% coverage** — both by Vitest thresholds and by the Sonar quality gate. Write enough tests in this ticket to clear that bar from day one.

## Scope boundaries

**In scope — unit tests only.** Everything runs in-process, container-free, with no network and no database.

**Explicitly out of scope** (deferred, recorded as debt in ADR-0008):

- `testcontainers` and any database-backed integration test
- `supertest` — Fastify's `app.inject()` covers HTTP-level testing with no extra dependency
- `autocannon` / load testing
- Using the CI `DATABASE_URL` secret from tests — it points at a shared database

## Acceptance criteria

- [ ] `pnpm test` (via `turbo run test`) runs Vitest in every package that has tests
- [ ] `turbo.json`'s `test` task declares `dependsOn: ["^build"]` and `outputs: ["coverage/**"]`
- [ ] Each package owns a `vitest.config.ts` — no root `vitest.workspace.ts`
- [ ] Tests are co-located as `src/**/*.test.ts` / `src/**/*.test.tsx`
- [ ] `apps/nebula-chat-server/tsconfig.json` excludes `**/*.test.ts` so tests never reach `dist/`
- [ ] `apps/nebula-chat-client/tsconfig.app.json` declares the Vitest and testing-library types so `tsc -b` passes over co-located tests
- [ ] `knip.json` recognises test files, so test-only devDependencies are not reported unused
- [ ] Server route tests use `app.inject()` against a real `buildApp()` with the repository layer mocked
- [ ] Client tests run on `jsdom` with React Testing Library, and mock the API through `msw` at the network layer (not by stubbing the Orval hooks)
- [ ] A `Test` step exists in `.github/workflows/build.yml`'s per-package matrix, after `Build`
- [ ] Vitest `coverage.thresholds` enforce **80%** per package and fail the `Test` step below it
- [ ] Sonar's `-Dsonar.coverage.exclusions=**/*` is removed and `sonar.javascript.lcov.reportPaths` is set
- [ ] Sonar's quality gate requires **80% on overall code and 80% on new code**, per project
- [ ] Co-located tests are declared to Sonar via `sonar.tests`, not scanned as production source
- [ ] Coverage exclusions cover code with no behavior to assert (schema declarations, SDK wiring, theme tokens, generated clients, migrations)
- [ ] Root `AGENTS.md` gains a Testing section; both app `AGENTS.md` files gain their package-specific conventions
- [ ] `.claude/skills/tdd/SKILL.md`'s "confirm the seams with the user" gate is replaced by the `AGENTS.md` rule (the seams discipline itself is kept)

## Coverage policy

80% is enforced **twice**, deliberately:

| Mechanism           | Runs where             | Why both                                                                                                                                     |
| ------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Vitest `thresholds` | `Test` step, no secret | The real gate. Sonar steps are guarded on `SONAR_TOKEN != ''`, so dependabot and fork PRs would otherwise bypass a Sonar-only gate entirely. |
| Sonar quality gate  | `SonarQube scan` step  | Dashboard, trend line, and second line of defence. Per project — Sonar has no cross-project aggregate.                                       |

Excluding a file from _coverage_ is not excluding it from _testing_. It is an assertion that there is no behavior there to assert on. Lowering a threshold is not an approved escape hatch; adding a justified coverage exclusion is.

## Per-package setup

| Package              | Environment | Notable config                                                          |
| -------------------- | ----------- | ----------------------------------------------------------------------- |
| `nebula-chat-server` | `node`      | `@backend/*` alias resolution; `tsconfig` excludes tests from the build |
| `nebula-chat-client` | `jsdom`     | Extends `vite.config.ts`; React Testing Library + `msw`; `@/*` alias    |
| `libs/langchain`     | `node`      | Highest-value target — token budget, rate limiting, streaming           |
| `libs/db`            | `node`      | Schema declarations — largely coverage-excluded                         |
| `libs/otel`          | `node`      | SDK wiring — largely coverage-excluded                                  |

## Seam map — what gets tested

Tests go at seams (public boundaries), never against internals. See `.claude/skills/tdd/SKILL.md`.

**`libs/langchain`** — the densest logic in the repo:

- `tokens/counter.ts`, `tokens/window.ts` — the **token budget**: prompt/completion/context-window limits, and the typed error on overflow rather than silent truncation. `CONTEXT.md` names this a first-class domain concept.
- `rate-limit/sliding-window.ts`, `rate-limit/concurrency.ts` — pure, time-dependent, classic off-by-one territory
- `streaming/sse.ts`, `streaming/runner.ts` — SSE event framing
- `prompts/`, `chains/`, `providers/`

**`apps/nebula-chat-server`**:

- `errors/error.handler.ts` — the `AppError` → HTTP status mapping every route depends on
- `config/pagination.config.ts`, `config/cors.config.ts`, `config/headers.config.ts`, `utils/trustProxy.ts`
- Per module (`chat`, `conversation`, `message`, `cache`): `.validation` (Zod schemas), `.service` (with the repository mocked), and `app.inject()` route tests covering success, validation failure, not-found, and rate-limited paths

**`apps/nebula-chat-client`**:

- `shared/utils/*` — `dateUtils`, `urlUtils`, `errorHandler`, `osUtils`, `menuUtils`, `scrollUtils`, `allowedLangs`
- `shared/stores/*` and `modules/chat/stores/*` — Zustand stores
- `shared/hooks/*` (11 hooks) and `modules/chat/hooks/*`
- Components, with `msw` intercepting the Orval-generated client — enough to clear 80%

## Notes

- **Tests run against built libraries.** `dependsOn: ["^build"]` means a server test importing `@nebula-chat/langchain` exercises the tsup `dist` artifact production runs — including the dual ESM+CJS output and the `exports` map, which is exactly where this repo has been burned before (see ADR-0007 and TICKET-M5).
- **`app.inject()` over `supertest`.** No listening socket, no extra dependency, and it still exercises real routing, real Zod validation, the real error handler, and the real `preHandler` hook chain on `/chat/stream`.
- **`msw` over stubbed hooks** on the client: the Orval client is regenerated from OpenAPI on every backend change, so mocking at the network layer keeps that generated code under test instead of replacing it.
