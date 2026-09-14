# AGENTS.md

Reference for AI agents (and contributors) working in this repository: monorepo-wide commands, workflow, and structure.

Package-specific conventions — directory layout, state management, module patterns, code examples — live in each package's own `AGENTS.md`, not here:

- [apps/nebula-chat-client/AGENTS.md](./apps/nebula-chat-client/AGENTS.md) — frontend (React, Zustand, Chakra UI)
- [apps/nebula-chat-server/AGENTS.md](./apps/nebula-chat-server/AGENTS.md) — backend (Fastify, Drizzle, Zod)

Read this file for anything that spans the whole repo; read the relevant package's `AGENTS.md` before touching code inside it.

---

## Table of Contents

1. [Development Commands](#development-commands)
2. [Git Workflow](#git-workflow)
3. [Code Quality](#code-quality)
4. [Testing](#testing)
5. [Cross-cutting Conventions](#cross-cutting-conventions)
6. [Monorepo Structure](#monorepo-structure)
7. [Local Development](#local-development)
8. [Keeping the Agentic Workspace in Sync](#keeping-the-agentic-workspace-in-sync)

---

## Development Commands

### Root (monorepo)

```bash
pnpm install                      # Install all workspace dependencies
pnpm run lint                     # ESLint (strict, max-warnings=0)
pnpm run lint:fix                 # Auto-fix linting issues
pnpm run format                   # Prettier format all files
pnpm run format:check             # Check formatting compliance
pnpm --filter nebula-chat-client run <cmd>  # Run frontend script (e.g. pnpm --filter nebula-chat-client run dev)
pnpm --filter nebula-chat-server run <cmd>  # Run backend script (e.g. pnpm --filter nebula-chat-server run dev)
```

### Frontend (`/apps/nebula-chat-client`)

```bash
pnpm dev        # Vite dev server on localhost:5173
pnpm build      # tsc + Vite build → /apps/nebula-chat-client/build
pnpm typecheck  # tsc --noEmit
```

### Backend (`/apps/nebula-chat-server`)

```bash
pnpm dev              # tsx watch mode (auto-restart) — assumes lib artifacts already built
pnpm start            # node dist/src/server.js (production)
pnpm generate:openapi # Regenerate openapi/openapi.yaml from live route schemas
```

> **`build` and `typecheck` must be run via Turbo** so workspace lib artifacts (`dist/*.d.ts`) are
> built first. Use these from the repo root:
>
> ```bash
> pnpm turbo run build     --filter=nebula-chat-server  # builds @nebula-chat/* deps first
> pnpm turbo run typecheck --filter=nebula-chat-server  # builds + typechecks dep closure first
> ```

### DB lib (`/libs/db` — `@nebula-chat/db`)

```bash
pnpm --filter @nebula-chat/db build        # Dual ESM+CJS build via tsup
pnpm --filter @nebula-chat/db db:push      # Sync schema to local DB without migration files (dev)
pnpm --filter @nebula-chat/db db:generate  # Generate SQL migration files from schema changes
pnpm --filter @nebula-chat/db db:migrate   # Apply pending migration files (production)
pnpm --filter @nebula-chat/db db:baseline  # Report journal state; --apply marks existing migrations applied
pnpm --filter @nebula-chat/db db:studio    # Open Drizzle Studio GUI
```

`DATABASE_URL` is read from `apps/nebula-chat-server/.env` by both the server at runtime and by the DB CLI commands — single source of truth.

`db:migrate` calls the drizzle-orm migrator directly (`src/migrate.ts`) rather than `drizzle-kit migrate`, which exits 1 without printing the underlying Postgres error — unusable in a deploy log. `db:baseline` exists for a database whose schema predates the migration journal: it reports what it would do and only writes with `--apply`.

### Local infrastructure

```bash
cd apps/nebula-chat-server && docker-compose up  # Start PostgreSQL (port 5332) + Redis (port 6380)
```

---

## Git Workflow

- **Never commit directly to `main`.** All work must go through a feature branch and pull request.
- Branch naming: `feat/<short-description>`, `fix/<short-description>`, `chore/<short-description>`, `refactor/<short-description>`. The branch prefix is free-form and independent of the commit type — a `chore/` branch still needs a `feat:` or `fix:` PR title, since only those reach Release Please.
- One logical change per branch. Don't bundle unrelated changes.
- Always push the branch and open a PR when the work is complete.

### Commits

- Use [Conventional Commits](https://www.conventionalcommits.org/) format: `type(scope): description`.
  - **Types: `feat`, `fix`, and `feat!` / `fix!` only.** Release Please ignores every other type, so a `chore:`/`docs:`/`refactor:` PR merges into `main` and then vanishes — no version bump, no changelog entry, no release. See [Release Please](#release-please) for how to choose between them.
  - Scope is optional but encouraged: `feat(chat): ...`, `fix(backend): ...`, `fix(frontend): ...`
- Keep the subject line under 72 characters.
- Commit logically complete units of work — don't leave the codebase in a broken state between commits.

### Pull Requests

- Always open a PR against `main`.
- PR title follows the same Conventional Commits format.
- PR description must include a brief summary of what changed and why, plus a test plan.
- Keep PRs small and focused. Split large changes into multiple PRs.

### Referencing tickets

Tickets from `/to-tickets` (and issues picked up via `/triage`) are GitHub issues — their "code" is the issue number. A PR that implements one must reference it, since nothing else links the two after merge:

- **Title**: append the issue number in parentheses at the end, after the Conventional Commit header: `type(scope): summary (#NN)`. The reference is trailing — it doesn't replace or share space with the `(scope)`.
- **Body**: include a `Closes #NN` (or `Fixes #NN`) line so GitHub auto-closes the ticket when the PR merges into `main`. Use `Part of #NN` instead only for the rare ticket that genuinely can't close in one PR — `/to-tickets` sizes tickets to close in one, so this should be uncommon.
- A PR spanning more than one ticket (avoid where possible — prefer one PR per ticket) lists each with its own `Closes #NN` / `Part of #NN` line.
- This is independent of the Release Please rules below: the issue number is for traceability, not for the version bump — don't put it in the commit **type** or **scope** position.

### Release Please

Releases on `main` are fully automated by [release-please](https://github.com/googleapis/release-please) (`.github/workflows/release-please.yml`, config in `release-please-config.json`) — it reads Conventional Commit messages on `main`, not anything written by hand. There is no manual changelog or version bump; get the commit/PR message right instead.

- **Squash-merge is this repo's default** (`squash_merge_commit_title: PR_TITLE`), so for a normal feature PR the **PR title becomes the one commit release-please parses** — get the title right, not just the individual commits inside the PR. If a PR is merged with a merge commit instead, every individual commit is parsed, so each one still needs a correct type/scope.
- **Only `feat` and `fix` produce a release. Use nothing else.** Release Please bumps a version solely off these types, so any other type is invisible: the work merges, and no release, tag, or changelog entry ever mentions it. This is a hard rule — a change worth merging is a change worth releasing.
- **Type decides the version bump** release-please applies to whichever component(s) the commit's changed files fall under:
  - `fix:` → patch bump. The default. Everything that isn't new capability: bug fixes, dependency bumps, tooling, CI, docs, refactors, test changes.
  - `feat:` → minor bump. New capability someone could use or notice — a new endpoint, a new UI affordance, a new documented convention.
  - `feat!:`, `fix!:`, or a footer of `BREAKING CHANGE: ...` → major bump. Use this only for an actual breaking change to a released package's public surface (e.g. `libs/db`'s exported types, the OpenAPI contract) — not for internal refactors.
- **Do not use `chore`, `refactor`, `docs`, `style`, `test`, `build`, `ci`, or `perf`.** Release Please drops them. Pick `fix` or `feat` by the rule above instead — when in doubt, `fix`.
- The cost of this rule is changelog noise: a CI tweak lands as a patch release. That is deliberate — a silently unreleased change is worse than an over-reported one.
- **Scope should name the release-please component** the change belongs to, matching
  `release-please-config.json`'s `packages` keys: `client` (`apps/nebula-chat-client`), `server`
  (`apps/nebula-chat-server`), `db` (`libs/db`), `langchain` (`libs/langchain`), `openapi`, or omit the scope
  (or use a repo-wide one like `fix(agents): ...`) for root-level tooling/docs changes (`CLAUDE.md`,
  `AGENTS.md`, `CONTEXT.md`, `.claude/`, `docs/`) — those fall under the root `nebula-chat` component, which
  explicitly excludes `apps/**`, `libs/**`, and `openapi/**`.
- release-please determines the bump **per component from the changed file paths**, not from the scope string — the scope is for changelog readability, so keep it accurate, but don't rely on it to control which package gets released.
- A commit that spans multiple components (e.g. a backend route change plus its regenerated `openapi.yaml` and Orval client) still needs one accurate primary scope; each affected component gets its own bump from the same commit regardless of what the scope says.

---

## Code Quality

Run these from the repo root after **every** code change — this is mandatory, not optional:

```bash
pnpm run lint:fix      # ESLint auto-fix (zero warnings tolerance)
pnpm run format        # Prettier format
```

Also run typecheck in the affected package before committing:

```bash
pnpm --filter nebula-chat-client run typecheck
pnpm --filter nebula-chat-server run typecheck
```

Do not disable ESLint rules with inline `// eslint-disable` comments unless absolutely necessary, and always document why.

---

## Testing

**Every PR that changes behavior ships tests at the seams that behavior crosses.** A behavior change
without a test is an incomplete PR. This is a hard rule, enforced mechanically by an 80% coverage gate —
see [ADR-0008](./docs/adr/0008-vitest-unit-testing-with-an-enforced-coverage-gate.md).

It is _not_ "write a test for every file". Tests go at **seams** — the public boundary where behavior is
observable without reaching inside. `.claude/skills/tdd/SKILL.md` is the reference for what a good test
is, where seams are, and the anti-patterns (implementation-coupled, tautological, horizontally sliced).
Pick the seams deliberately; do not generate a test per function to move a number.

```bash
pnpm turbo run test              # every package
pnpm backend test                # server only
pnpm frontend test               # client only
pnpm --filter @nebula-chat/langchain test
```

### Rules

- **Vitest everywhere.** One runner for all five packages. Each package owns a `vitest.config.ts`; there
  is no root workspace config.
- **One test file per source file, named after it**: `useDrawerStore.ts` is tested by
  `useDrawerStore.test.ts` and by nothing else. A file named for a grouping rather than a module
  (`hooks.test.ts`, `stores.test.ts`, `chatComponents.test.tsx`) is wrong — when a test fails, its
  filename should already name the module at fault.
- **Tests live in a `tests/` folder beside the code under test**: `src/shared/hooks/useResponsiveLayout.ts`
  is tested by `src/shared/hooks/tests/useResponsiveLayout.test.ts`. Helpers shared by the tests in one
  folder sit alongside them (`tests/openCloseStore.contract.ts`); helpers shared across a package live in
  `src/test/`.
- **Frontend API mocks come from the OpenAPI spec, never from a hand-written URL.** Orval generates MSW
  handlers next to the client (`*.msw.ts`), and they match any origin, so a test calls
  `getListConversationsMockHandler(payload)` rather than naming `http://localhost:3000/api/conversations`.
  Failure responses and the SSE chat endpoint (excluded from Orval by tag) go through `@/test/api`, which
  is the only place a route string is written.
- **Tests run against built libraries.** `turbo`'s `test` task declares `dependsOn: ["^build"]`, so a test
  importing `@nebula-chat/*` exercises the tsup `dist` artifact production actually runs — not the lib's
  source. Never alias `@nebula-chat/*` to `libs/*/src` in a Vitest config.
- **80% coverage, enforced twice.** Vitest `coverage.thresholds` fail the CI `Test` step, and Sonar's
  quality gate requires 80% on both overall and new code, per project. The Vitest threshold is the real
  gate: Sonar steps are skipped when `SONAR_TOKEN` is absent (dependabot and fork PRs), so a Sonar-only
  gate would not apply there.
- **Below the bar? Add a coverage exclusion, never lower a threshold.** Excluding a file from _coverage_
  asserts it has no behavior to test (schema declarations, SDK wiring, theme tokens, generated clients,
  migrations). Lowering the threshold asserts nothing and is not an approved escape hatch.
- **Unit tests only, for now.** No testcontainers, no live database, no network. Database-backed
  integration testing is deliberate, recorded debt — see ADR-0008.
- **Mock at the boundary, not the internals.** Server: mock the repository layer, keep routing, Zod
  validation and the error handler real. Client: mock HTTP with `msw`, never stub the Orval-generated
  hooks.
- **A failing test is never fixed by skipping, deleting or weakening it.** Fix the code, or fix a test
  that was asserting the wrong thing — and say which.

See each app's `AGENTS.md` for package-specific conventions and examples.

---

## Cross-cutting Conventions

These apply everywhere in the repo, frontend and backend alike. See each package's `AGENTS.md` for the full rules and code examples.

- **`type`, never `interface`.** No exceptions, anywhere.
- **`const` arrow functions, never `function` declarations.** Applies to hooks, utils, helpers, components, and route handlers alike.
- **No `index.ts` barrel files inside an app.** Import directly from the file that defines the thing. Two
  exceptions, and only two: `index.ts` files emitted by code generators (e.g. Orval output), which are never
  hand-authored or hand-edited; and the single top-level `src/index.ts` of a package under `libs/`, which is
  that package's public surface — it is what `tsup`'s `entry` and the `exports` map point at, so it is
  required, not optional. `libs/db`, `libs/langchain` and `libs/otel` each have exactly one. Never nest a
  barrel below that.
- **No relative imports.** Frontend uses `@/*` (→ `apps/nebula-chat-client/src/`); backend uses `@backend/*` (→ `apps/nebula-chat-server/src/`).

---

## Monorepo Structure

```text
nebula-chat/
├── apps/
│   ├── nebula-chat-client/   # React SPA (frontend) — see its AGENTS.md
│   └── nebula-chat-server/   # Fastify API (backend) — see its AGENTS.md
├── libs/
│   ├── db/                   # @nebula-chat/db — Drizzle ORM schema + migrations
│   ├── langchain/            # @nebula-chat/langchain — LLM providers, tokens, streaming, SSE
│   └── otel/                 # @nebula-chat/otel — Pino logger factory + OpenTelemetry tracing
├── openapi/                  # Generated OpenAPI spec — its own workspace package
├── CLAUDE.md                 # Claude Code operating instructions
├── CONTEXT.md                # Domain vocabulary glossary
├── AGENTS.md                 # This file
├── package.json               # Root workspace (pnpm)
└── pnpm-workspace.yaml
```

Both apps are managed with pnpm workspaces. Run scripts scoped to a package:

```bash
pnpm --filter nebula-chat-client run dev
pnpm --filter nebula-chat-server run dev
```

### Creating a new lib

When scaffolding a new package under `libs/`, follow these steps **in order** before anything else:

1. **Create `libs/<name>/.gitignore`** containing at minimum `dist/` and `node_modules/` — prevents build artifacts from ever reaching the index.
2. **Add the package to `release-please-config.json`** under `"packages"` so it is versioned from day one.
3. Implement the lib, then **commit and push** when the work is complete.

Never skip steps 1 or 2, even for small utility libs. If the lib is substantial enough to need its own conventions, give it its own `AGENTS.md` and link it from this file's list at the top.

---

## Local Development

```bash
# 1. Install dependencies
pnpm install

# 2. Start infrastructure (PostgreSQL on :5332, Redis on :6380)
cd apps/nebula-chat-server && docker-compose up -d

# 3. Run DB migrations
pnpm --filter @nebula-chat/db db:migrate

# 4. Start backend (watch mode)
pnpm --filter nebula-chat-server run dev

# 5. Start frontend (Vite dev server on :5173)
pnpm --filter nebula-chat-client run dev
```

### API Docs (dev)

Open `http://localhost:3000/docs` for the Swagger UI once the backend is running.

Environment variables are documented per-package: see [Frontend Environment Variables](./apps/nebula-chat-client/AGENTS.md#environment-variables) and [Backend Environment Variables](./apps/nebula-chat-server/AGENTS.md#environment-variables).

---

## Keeping the Agentic Workspace in Sync

This repo's `.claude/` workspace (agents, skills) and its documentation (`AGENTS.md` files, `CLAUDE.md`, `CONTEXT.md`, `docs/adr/`) describe the codebase as it actually is. When they drift, agents make decisions on stale information — treat a stale reference here the same as a stale code comment: a bug to fix, not a nit to skip.

**Whenever a change touches conventions, module layout, or architecture, update these in the same PR:**

- The relevant `AGENTS.md` — root for cross-cutting changes, the package's own `AGENTS.md` for package-specific ones.
- `CONTEXT.md` if domain vocabulary was introduced, renamed, or retired (this is `/domain-modeling`'s job, ideally done upstream during `/grill-with-docs`/`/to-spec`, not as an afterthought here).
- `docs/adr/` if the change is hard-to-reverse, surprising, or the result of a real trade-off (see `/domain-modeling`'s ADR criteria).
- Any `.claude/agents/*.md` whose required-reading, guardrails, or file paths reference the area that changed (e.g. a renamed directory, a retired ticket, a changed convention). `meta-synchronizer` can be invoked to audit the whole roster, but don't rely on it to catch what you already know changed.

A PR that changes how the codebase works but leaves these docs describing the old way is not done.
