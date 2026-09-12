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
4. [Cross-cutting Conventions](#cross-cutting-conventions)
5. [Monorepo Structure](#monorepo-structure)
6. [Local Development](#local-development)
7. [Keeping the Agentic Workspace in Sync](#keeping-the-agentic-workspace-in-sync)

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
pnpm --filter @nebula-chat/db db:studio    # Open Drizzle Studio GUI
```

`DATABASE_URL` is read from `apps/nebula-chat-server/.env` by both the server at runtime and by drizzle-kit CLI commands — single source of truth.

### Local infrastructure

```bash
cd apps/nebula-chat-server && docker-compose up  # Start PostgreSQL (port 5332) + Redis (port 6380)
```

---

## Git Workflow

- **Never commit directly to `main`.** All work must go through a feature branch and pull request.
- Branch naming: `feat/<short-description>`, `fix/<short-description>`, `chore/<short-description>`, `refactor/<short-description>`.
- One logical change per branch. Don't bundle unrelated changes.
- Always push the branch and open a PR when the work is complete.

### Commits

- Use [Conventional Commits](https://www.conventionalcommits.org/) format: `type(scope): description`.
  - Types: `feat`, `fix`, `perf`, `chore`, `refactor`, `docs`, `style`, `test`, `build`, `ci`.
  - Scope is optional but encouraged: `feat(chat): ...`, `fix(backend): ...`, `refactor(frontend): ...`
- Keep the subject line under 72 characters.
- Commit logically complete units of work — don't leave the codebase in a broken state between commits.

### Pull Requests

- Always open a PR against `main`.
- PR title follows the same Conventional Commits format.
- PR description must include a brief summary of what changed and why, plus a test plan.
- Keep PRs small and focused. Split large changes into multiple PRs.

### Release Please

Releases on `main` are fully automated by [release-please](https://github.com/googleapis/release-please) (`.github/workflows/release-please.yml`, config in `release-please-config.json`) — it reads Conventional Commit messages on `main`, not anything written by hand. There is no manual changelog or version bump; get the commit/PR message right instead.

- **Squash-merge is this repo's default** (`squash_merge_commit_title: PR_TITLE`), so for a normal feature PR the **PR title becomes the one commit release-please parses** — get the title right, not just the individual commits inside the PR. If a PR is merged with a merge commit instead, every individual commit is parsed, so each one still needs a correct type/scope.
- **Type decides the version bump** release-please applies to whichever component(s) the commit's changed files fall under:
  - `fix:` → patch bump.
  - `feat:` → minor bump.
  - `feat!:`, `fix!:`, or a footer of `BREAKING CHANGE: ...` → major bump. Use this only for an actual breaking change to a released package's public surface (e.g. `libs/db`'s exported types, the OpenAPI contract) — not for internal refactors.
  - `perf:` → patch bump.
  - `chore:`, `refactor:`, `docs:`, `style:`, `test:`, `build:`, `ci:` → no version bump, changelog entry only (some types are excluded from the changelog by config).
- **Scope should name the release-please component** the change belongs to, matching `release-please-config.json`'s `packages` keys: `client` (`apps/nebula-chat-client`), `server` (`apps/nebula-chat-server`), `db` (`libs/db`), `langchain` (`libs/langchain`), `openapi`, or omit the scope (or use a repo-wide one like `chore(agents): ...`) for root-level tooling/docs changes (`CLAUDE.md`, `AGENTS.md`, `CONTEXT.md`, `.claude/`, `docs/`) — those fall under the root `nebula-chat` component, which explicitly excludes `apps/**`, `libs/**`, and `openapi/**`.
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

## Cross-cutting Conventions

These apply everywhere in the repo, frontend and backend alike. See each package's `AGENTS.md` for the full rules and code examples.

- **`type`, never `interface`.** No exceptions, anywhere.
- **`const` arrow functions, never `function` declarations.** Applies to hooks, utils, helpers, components, and route handlers alike.
- **No `index.ts` barrel files, anywhere.** Import directly from the file that defines the thing. The only tolerated `index.ts` files are those emitted by code generators (e.g. Orval output) — never hand-author or hand-edit them.
- **No relative imports.** Frontend uses `@/*` (→ `apps/nebula-chat-client/src/`); backend uses `@backend/*` (→ `apps/nebula-chat-server/src/`).

---

## Monorepo Structure

```
nebula-chat/
├── apps/
│   ├── nebula-chat-client/   # React SPA (frontend) — see its AGENTS.md
│   └── nebula-chat-server/   # Fastify API (backend) — see its AGENTS.md
├── libs/
│   └── db/                   # @nebula-chat/db — Drizzle ORM schema + migrations
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
