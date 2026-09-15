# ADR-0008: Vitest unit testing across every package, with an enforced 80% coverage gate

- **Status:** Accepted — implemented on `claude/festive-newton-oyclqy`
- **Date:** 2026-09-14
- **Deciders:** @itsDaiton

## Context

This repo has shipped four migration tickets — M-1 (Fastify), M-2 (Drizzle), M-3 (LangChain), M-5 (OTel) —
with **zero automated tests**. There is no `vitest`, `supertest` or `testcontainers` in any `package.json`, no
`*.test.ts` anywhere, and `turbo.json` declares a `test` task (`"test": {}`) that no package implements.
`.github/workflows/build.yml` runs lint → format → typecheck → build → Sonar, with no test step at all, and
both Sonar legs pass `-Dsonar.coverage.exclusions=**/*` — coverage is explicitly switched off for every file.

The consequence is not just missing tests. The repo's own agent workflow routes every non-trivial change through `/implement`, which drives `/tdd` internally — and `/tdd` has had no runner to drive. The red→green loop has been a no-op for four tickets. `.claude/agents/test-strategist.md` exists and has never had a suite to maintain.

`docs/new-backend/TICKET-M9-testing.md` specifies the testing stack, but it was written before M-1 and M-5
landed and is wrong in several concrete ways: it references a "CI-1" workflow that does not exist, targets an
`apps/server` path that is actually `apps/nebula-chat-server`, and prescribes five tools at once (Vitest,
Supertest, testcontainers, msw, autocannon) before a single assertion about this codebase exists.

Meanwhile the code most worth testing is not in the server at all. `tiktoken` resolves to exactly one place —
`libs/langchain/src/tokens/counter.ts` — so the **token budget**, which `CONTEXT.md` names as a first-class
domain concept and which decides whether a user is wrongly rejected or silently overcharged, sits in a
library. The server's own pure logic is a short list: `errors/error.handler.ts`,
`config/pagination.config.ts`, `utils/trustProxy.ts`.

## Decision

Adopt **Vitest as the single test runner for every package**, with one test file per source module in a
`tests/` folder beside it (`src/shared/hooks/tests/useResponsiveLayout.test.ts`), and gate merges on
**80% coverage per Sonar project**.

### Unit tests only — no testcontainers, no live database

The first testing ticket deliberately ships **unit tests only**. Database-backed integration tests, testcontainers, and autocannon load testing are all out of scope.

Route handlers are still tested, through **Fastify's built-in `app.inject()`** against a real `buildApp()`
instance with the repository layer mocked via `vi.mock`. This keeps every test in-process and container-free
while still exercising the layers where this codebase's bugs actually live: Zod route schemas, the `AppError`
→ HTTP mapping in `errors/error.handler.ts`, and the `preHandler` hook chain on `/chat/stream`. `supertest` is
**not** added — it exists to give a listening socket to frameworks that lack an inject API, and Fastify is not
one.

This is a deliberate rejection of the obvious path. `build.yml` already passes `DATABASE_URL: ${{ secrets.DATABASE_URL }}` into every build leg, so a real Postgres _is_ reachable in CI without testcontainers. It is not used: that secret points at a shared database, and tests that write to it would eventually race a deploy or poison real rows.

### One test file per source module, in a `tests/` folder beside it

**Amended 2026-09-14.** This ADR originally specified bare co-location (`useDrawerStore.test.ts` sitting
directly beside `useDrawerStore.ts`), and the first implementation also grouped unrelated modules into
files named after a layer rather than a module — `hooks.test.ts`, `stores.test.ts`,
`chatComponents.test.tsx`. Both are superseded:

- **One test file per source file, named after it.** A failing test's filename should already name the
  module at fault, and a grouped file quietly becomes the place new tests are appended regardless of what
  they cover. The client's 24 test files became 63 under this rule with no change to what is asserted.
- **Tests live in a `tests/` folder beside the code under test.** Source directories stay readable at a
  glance, and a test's local helpers have an obvious home without sitting in the module
  directory pretending to be product code.

Tests stay _next to_ their subject rather than in a mirrored top-level tree: that is what makes the `/tdd`
loop and AI navigation cheap. On the server this is not free, because `build` is `tsc && tsc-alias` over
`include: ["src/**/*.ts"]` — left alone, every test file compiles into `dist/` and ships in the production
image. Three compensating edits are therefore load-bearing and must not be "cleaned up":

1. **`apps/nebula-chat-server/tsconfig.build.json`** excludes `src/**/*.test.ts` and `src/**/tests/**` so tests never reach `dist/`.
2. **Sonar** moves test globs to `sonar.tests` — tests inside `-Dsonar.sources=src` would otherwise be scanned as production source and wreck duplication and complexity metrics.
3. **`knip.json`** gains test patterns, or `vitest` and the testing-library packages are reported as unused devDependencies.

The client has no `dist` problem (`noEmit: true`, and Vite tree-shakes), but its `tsc -b` over `include: ["src"]` **does** typecheck test files, so `vitest/globals` and the testing-library types must be declared in `tsconfig.app.json`'s `types` array or the build breaks.

### Frontend HTTP mocks are generated from the OpenAPI document

`orval.config.ts` declares `mock.generators: [{ type: 'msw' }]`, so every documented success response gets
an MSW handler beside the generated client. A client test calls
`getListConversationsMockHandler(payload)` instead of `http.get('http://localhost:3000/api/conversations')`:
the mock and the client are generated from the same document the backend emits, so a route that moves or a
response that changes shape breaks the test at regeneration rather than silently passing against a stale
hand-written URL. The handlers match any origin, which is what removes the hard-coded host.

Two gaps have no generated handler, and both are covered by `@/test/api` — the single place a route string
is still written:

- **Failure responses.** Orval generates the documented success response only.
- **`/api/chat/stream`.** Excluded from Orval by tag, because it streams SSE rather than returning JSON.

This required un-breaking msw's path matching. The workspace pins `path-to-regexp: 8.4.0` for every
package, but msw declares `^6.3.0` and builds wildcard paths (`*/api/...`) with it; v8 removed unnamed
wildcards, so every such handler threw `PathError: Missing parameter name`. The override is now scoped
(`msw>path-to-regexp: ^6.3.0`), which keeps msw on the release that fixes GHSA-9wv6-86v2-598j while
everything else stays on 8.4.0.

### Tests run against built libraries, not library sources

`turbo.json`'s `test` task declares `dependsOn: ["^build"]`. The three workspace libs are consumed through their `exports` map (`./dist/index.mjs` / `./dist/index.js`, built by tsup), so a server test importing `@nebula-chat/langchain` exercises **the artifact production actually runs**.

The rejected alternative — aliasing `@nebula-chat/*` to `libs/*/src` in the Vitest config — is faster and
needs no build, but would make tests blind to the dual ESM+CJS output, the `exports` map, and the emitted
`.d.ts`. That is precisely where this repo has already been burned: ADR-0007 and TICKET-M5 both document
packaging failures, including duplicate `drizzle-orm` variants breaking `pnpm typecheck` across a lib
boundary. Turbo caches the lib builds, so the cost is one build, once.

### Per-package configs, not a workspace config

Each package owns its own Vitest config — `vitest.config.ts` in the client, `vitest.config.mts` in the four CommonJS packages, so Vite does not warn about loading an ESM config from a CJS package.

The environments are genuinely different — the server is Node + CommonJS + `@backend/*` path aliases; the client is jsdom + React + `@/*`; the libs are plain Node ESM. A root `vitest.workspace.ts` would have to carry all three anyway, and `turbo run test` already provides the single-command experience at the root.

The client config is deliberately standalone rather than extending `vite.config.ts`: that config registers `versionPlugin`, which writes `public/version.json` on `buildStart` and has no business running during a test.

### Coverage is enforced twice, at 80%, per project

**Both** Vitest's `coverage.thresholds` and Sonar's quality gate enforce 80%, and the redundancy is deliberate rather than an oversight.

`build.yml` guards every Sonar step on `if: ${{ env.SONAR_TOKEN != '' }}`, because dependabot and fork PRs do
not receive the secret. A **Sonar-only coverage gate would therefore be silently absent on exactly those
PRs**. Vitest thresholds run inside the `Test` step with no token, fail fast, and work per-package — so they
are the real gate, and Sonar is the dashboard, the trend line, and the second line of defence.

The gate is **80% on overall code and 80% on new code**, for each of the five Sonar projects independently
(Sonar has no cross-project aggregate). Overall-at-80 is the strict reading: unlike Sonar's default new-code
condition, it fails until the whole project is genuinely covered, which is the point — the alternative
ratchets up slowly and leaves four tickets' worth of existing code permanently unexamined. Files where
coverage is meaningless — Drizzle schema declarations, OTel SDK wiring, Chakra theme tokens, the
Orval-generated API client, migrations — are added to `sonar.coverage.exclusions` as they are identified.
Excluding a file from _coverage_ is not excluding it from _testing_; it is an assertion that there is no
behavior there to assert on.

**The gate goes live in the same PR that adds the tests**, so the PR gates itself. A threshold deferred to "the next PR" has a way of not arriving.

### "Always add tests" replaces the seams gate, it does not remove it

`.claude/skills/tdd/SKILL.md` says _"Test only at pre-agreed seams. Before writing any test, write down the
seams under test and confirm them with the user. No test is written at an unconfirmed seam."_ That discipline
is what stops agents generating tautological tests, and it is **kept**. What is removed is the
_confirm-with-the-user gate_, which in practice made testing optional and is the proximate reason four tickets
shipped bare.

The rule recorded in `AGENTS.md` is therefore: **every PR that changes behavior ships tests at the seams that
behavior crosses** — not "always write tests for everything". The rule lives in `AGENTS.md` (root, plus
per-app conventions in each app's file) and deliberately **not** in the ten `.claude/agents/*.md` definitions,
which all load `AGENTS.md` via `/load-conventions`; duplicating it into ten files would create ten places to
drift.

## Consequences

- **`pnpm test` becomes a merge gate.** A behavior change without a test is now an incomplete PR, mechanically and not just by convention.
- **The `Test` step slots into the existing build matrix**, inheriting its path filters, turbo cache, and the single `build-result` required status check. No new workflow and no new branch-protection rule.
- **Sonar's `-Dsonar.coverage.exclusions=**/*` comes off**, and `sonar.javascript.lcov.reportPaths` goes on. Coverage becomes visible per project for the first time.
- **The 80% overall gate is strict and will bite.** Any package that drops below 80 blocks its own merge. This is the intended behavior, and the escape hatch is a coverage exclusion for code with no behavior — never a lowered threshold.
- **Integration testing remains genuinely absent.** Nothing in this repo yet verifies that a query Drizzle generates actually runs against Postgres, or that a real OpenAI stream parses. That debt is recorded here deliberately so it is not mistaken for oversight; testcontainers is the follow-up.
