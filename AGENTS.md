# AGENTS.md

Reference for AI agents (and contributors) working in this repository: monorepo-wide commands, workflow, and structure.

Package-specific conventions — directory layout, state management, module patterns, code examples — live in each package's own `AGENTS.md`, not here:

- [apps/nebula-chat-client/AGENTS.md](./apps/nebula-chat-client/AGENTS.md) — frontend (React, Zustand, Chakra UI)
- [apps/nebula-chat-server/AGENTS.md](./apps/nebula-chat-server/AGENTS.md) — backend (Fastify, Drizzle, Zod)

Read this file for anything that spans the whole repo; read the relevant package's `AGENTS.md` before touching code inside it.

---

## Development Commands

Monorepo-wide, from the repo root:

```bash
pnpm install                                   # install all workspace dependencies
pnpm run lint | lint:fix | format | format:check
pnpm --filter <pkg> run <cmd>                  # run one package's script
pnpm turbo run build|typecheck --filter=<pkg>  # builds workspace lib artifacts (dist/*.d.ts) first
```

Start local infrastructure (PostgreSQL on `:5332`, Redis on `:6380`):

```bash
cd apps/nebula-chat-server && docker-compose up
```

Package-specific scripts live with the package: frontend `dev`/`build`/`typecheck` in the [frontend AGENTS.md](./apps/nebula-chat-client/AGENTS.md#commands); backend `dev`/`start`/`generate:openapi` and the `@nebula-chat/db` `db:*` migration commands in the [backend AGENTS.md](./apps/nebula-chat-server/AGENTS.md#commands).

---

## Git Workflow

- **Never commit directly to `main`.** All work must go through a feature branch and pull request.
- Branch naming: `feat/<short-description>`, `fix/<short-description>`, `chore/<short-description>`, `refactor/<short-description>` — or `type/neb-<n>-<slug>` when the work comes from a ticket (see [Referencing tickets](#referencing-tickets)). The branch prefix is free-form and independent of the commit type — a `chore/` branch still needs a `feat:` or `fix:` PR title, since only those reach Release Please.
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

Tickets from `/to-tickets` (and issues picked up via `/triage`) are GitHub issues. Each issue **is** a ticket, identified by the Jira-style key **`NEB-<issue-number>`** — issue `#329` is ticket `NEB-329`. The key is a human-friendly alias over the GitHub issue number; there is no separate counter to maintain, and it's the token you write in branches, commits, and PR titles (where a bare `#329` is ambiguous — GitHub shares that number space with PRs). A PR that implements a ticket must carry its ID, since nothing else links the two after merge:

- **The issue title is the PR title.** Once an issue is filed, edit its title to carry its ID — `type(scope): NEB-<n> summary` (the ID, a space, then the summary — no colon after it) — and the implementing PR reuses that exact string. Example: `feat(server): NEB-330 migrate the HTTP framework from Express to Fastify`; breaking: `feat(server)!: NEB-330 …`. The `NEB-<n>` sits in the description position, right after the Conventional Commit header.
- **Branch**: `type/neb-<n>-<slug>`, e.g. `feat/neb-330-fastify`.
- **Body**: include a `Closes #NN` (or `Fixes #NN`) line. GitHub's auto-close keys off the bare `#NN`, **not** the `NEB-` alias, so this line is what actually closes the ticket when the PR merges into `main`. Use `Part of #NN` only for the rare ticket that genuinely can't close in one PR — `/to-tickets` sizes tickets to close in one, so this should be uncommon.
- A PR spanning more than one ticket (avoid where possible — prefer one PR per ticket) names each ID in the title and adds one `Closes #NN` line per ticket in the body.
- The ID lives in the description position on purpose — `NEB-330` then shows in the changelog line Release Please generates — but never in the commit **type** or **scope** position. A PR with no backing ticket (ad-hoc maintenance) drops the `NEB-<n>:` and uses the plain `type(scope): summary` form.

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

- **Vitest everywhere.** One runner for all five packages, and no root workspace config. Each package
  owns its own: `vitest.config.ts` in the client, `vitest.config.mts` in the four CommonJS packages, so
  Vite does not warn about loading an ESM config from a CJS package.
- **One test file per source file, named after it**: `useDrawerStore.ts` is tested by
  `useDrawerStore.test.ts` and by nothing else. A file named for a grouping rather than a module
  (`hooks.test.ts`, `stores.test.ts`, `chatComponents.test.tsx`) is wrong — when a test fails, its
  filename should already name the module at fault.
- **Tests live in a `tests/` folder beside the code under test**: `src/shared/hooks/useResponsiveLayout.ts`
  is tested by `src/shared/hooks/tests/useResponsiveLayout.test.ts`. Helpers shared by the tests in one
  folder sit alongside them; helpers shared across a package live in `src/test/`. A test file must contain
  its own assertions — a file whose `it()` blocks come from a helper reads as empty to both Sonar
  (`typescript:S2187`) and to the next person to open it.
- **Tests run against built libraries.** `turbo`'s `test` task declares `dependsOn: ["^build"]`, so a test
  importing `@nebula-chat/*` exercises the tsup `dist` artifact production actually runs — not the lib's
  source. Never alias `@nebula-chat/*` to `libs/*/src` in a Vitest config.
- **80% coverage, enforced twice.** Vitest `coverage.thresholds` fail the CI `Test` step, and Sonar's
  quality gate requires 80% on both overall and new code, per project. The Vitest threshold is the real
  gate: Sonar steps are skipped when `SONAR_TOKEN` is absent (dependabot and fork PRs), so a Sonar-only
  gate would not apply there.
- **Below the bar? Add a coverage exclusion, never lower a threshold.** Excluding a file from _coverage_
  asserts it has no behavior to test (schema declarations, SDK wiring, theme tokens, generated clients,
  migrations). Lowering the threshold asserts nothing and is not an approved escape hatch. A coverage
  exclusion lives in two places — the package's `vitest.config` and `matrix.coverage` in
  `.github/workflows/build.yml` — and must be added to both, or the two gates measure different
  denominators. They cannot share one list: `logger.ts` is excluded in the server and langchain but is
  the main tested unit in otel.
- **Unit tests only, for now.** No testcontainers, no live database, no network. Database-backed
  integration testing is deliberate, recorded debt — see ADR-0008.
- **Mock at the boundary, not the internals** — see each package's `AGENTS.md` for where that boundary sits.
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
│   ├── auth/                 # @nebula-chat/auth — better-auth substrate (sessions, anonymous, claim)
│   ├── db/                   # @nebula-chat/db — Drizzle ORM schema + migrations
│   ├── langchain/            # @nebula-chat/langchain — LLM providers, tokens, streaming, SSE
│   ├── otel/                 # @nebula-chat/otel — Pino logger factory + OpenTelemetry tracing
│   └── redis/                # @nebula-chat/redis — shared Redis connection + cache primitive
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
3. **Create a `lib:<name>` GitHub label** (`gh label create lib:<name> --color 5319e7 --description "Touches libs/<name>"`) so tickets touching it can be labelled — see `docs/agents/issue-tracker.md` → Labels.
4. Implement the lib, then **commit and push** when the work is complete.

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

This repo's `.claude/` workspace (skills) and its documentation (`AGENTS.md` files, `CLAUDE.md`, `CONTEXT.md`, `docs/adr/`) describe the codebase as it actually is. When they drift, agents make decisions on stale information — treat a stale reference here the same as a stale code comment: a bug to fix, not a nit to skip.

**Whenever a change touches conventions, module layout, or architecture, update these in the same PR:**

- The relevant `AGENTS.md` — root for cross-cutting changes, the package's own `AGENTS.md` for package-specific ones.
- `CONTEXT.md` if domain vocabulary was introduced, renamed, or retired (this is `/domain-modeling`'s job, ideally done upstream during `/grill-with-docs`/`/to-spec`, not as an afterthought here).
- `docs/adr/` if the change is hard-to-reverse, surprising, or the result of a real trade-off (see `/domain-modeling`'s ADR criteria).
- Any `.claude/skills/**` whose steps or file paths reference the area that changed (e.g. a renamed directory, a retired ticket, a changed convention).

A PR that changes how the codebase works but leaves these docs describing the old way is not done.
