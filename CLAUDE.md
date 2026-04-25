# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
pnpm dev              # tsx watch mode (auto-restart)
pnpm build            # tsc + path alias resolution
pnpm start            # node dist/src/server.js (production)
pnpm typecheck        # tsc --noEmit
pnpm generate:openapi # Regenerate openapi/openapi.yaml from live route schemas

pnpm prisma:migrate   # Create and run migrations
pnpm prisma:deploy    # Deploy migrations (production)
pnpm prisma:generate  # Regenerate Prisma Client
pnpm prisma:studio    # Open Prisma Studio
```

### Local infrastructure

```bash
cd apps/nebula-chat-server && docker-compose up  # Start PostgreSQL (port 5332) + Redis (port 6380)
```

## Architecture

This is a TypeScript monorepo with two packages under `apps/`: `nebula-chat-client` (frontend) and `nebula-chat-server` (backend).

### Frontend (`/apps/nebula-chat-client`)

React 19 SPA built with Vite and Chakra UI. State is managed with **Zustand** stores (see `AGENTS.md` for conventions). `src/App.tsx` mounts two providers:

- `ThemeProvider` (Next Themes)
- `ConversationsProvider` — triggers the initial conversations fetch; state lives in `useConversationsStore`

Feature code lives in `src/modules/` (chat, conversations, auth). Shared UI components, layouts, and stores are in `src/shared/`. The API base URL is configured via `VITE_API_URL`.

Chat responses are streamed from the backend and rendered using `react-markdown` + `shiki` for syntax highlighting.

### Backend (`/apps/nebula-chat-server`)

Fastify 5 REST API with:

- **PostgreSQL + Prisma**: Two models — `Conversation` (1:many) `Message`. Schema at `prisma/schema.prisma`.
- **Redis**: Caches chat responses. Cache hooks are layered onto routes.
- **OpenAI**: Streaming completions. Token counting via `tiktoken` to manage context window. Key logic in `src/modules/chat/`.
- **Rate limiting**: `@fastify/rate-limit` plugin, opt-in per route (applied to `POST /api/chat/stream`).
- **OpenAPI docs**: Generated dynamically by `@fastify/swagger` via `fastify-type-provider-zod`. Route `schema:` blocks are the single source of truth — no separate registry or `*.openapi.ts` files. Swagger UI at `/docs`, raw spec at `/openapi.json`. Export with `pnpm generate:openapi` (writes `openapi/openapi.yaml`).
- **Validation**: `fastify-type-provider-zod` wires Zod into Fastify's native type-provider (`validatorCompiler` / `serializerCompiler`). Schemas go in `schema:` on routes using `FastifyPluginAsyncZod`. No manual `validate()` middleware.
- **Env validation**: `src/env.ts` Zod-parses `process.env` at startup — missing/invalid vars cause a hard failure before any listener is bound.

`src/app.ts` exports `buildApp()`; `src/server.ts` is a thin entry point that calls it. Route structure: `/api/chat`, `/api/conversations`, `/api/messages`, `/api/cache`, `/health`.

Errors use a custom `AppError` class. Path aliases use `@backend/*` mapping to `src/*`.

### Key environment variables

| Variable                      | Where                                 |
| ----------------------------- | ------------------------------------- |
| `VITE_API_URL`                | `apps/nebula-chat-client/.env`        |
| `OPENAI_API_KEY`              | `apps/nebula-chat-server/.env`        |
| `DATABASE_URL`                | `apps/nebula-chat-server/.env`        |
| `REDIS_URL`, `REDIS_PASSWORD` | `apps/nebula-chat-server/.env`        |
| `CLIENT_URL`, `SERVER_URL`    | `apps/nebula-chat-server/.env` (CORS) |

## Code Style

- ESLint with TypeScript strict rules, React hooks validation, and import sorting — enforced with zero warnings tolerance.
- Prettier: single quotes, semicolons, trailing commas, 100-char print width, 2-space indent.
- Backend uses `@backend/*` path aliases. Frontend has its own `tsconfig.json` targeting ESNext.

## Shipping (branch + PR) — applies to every agent

This rule applies to **every** build/write agent in `.claude/agents/`. Read-only agents (e.g. `code-reviewer`, `security-auditor`) do not open PRs but may comment on existing ones via `gh`. For Git workflow, **follow `AGENTS.md` as the source of truth**; the guidance below is intended to stay consistent with it, not override it.

- **Never commit to `main`.** If currently on `main`, create a feature branch before the first edit: `git checkout -b <type>/<kebab-slug>`.
- **Reuse the active feature branch** if one is already checked out (e.g. `adr-author` opened it) — don't fork a parallel branch for the same unit of work.
- **Branch naming** uses the `AGENTS.md`-approved prefixes: `feat/...`, `fix/...`, `refactor/...`, `chore/...`. Architectural migration branches include the ticket: `feat/m-<n>-<slug>`.
- **Commit in logical chunks** using Conventional Commits (`feat(<scope>): ...`, `fix(<scope>): ...`). Never bundle unrelated changes.
- **Publish the branch** with `git push -u origin <branch>` on first push.
- **Open a PR when the work is complete**, consistent with `AGENTS.md`. Use `gh pr create` with the primary Conventional Commit header as the title. The body must include: one-line summary, test plan checklist, and a link to the ADR (`docs/adr/NNNN-*.md`) backing the change.
- **Never merge your own PR** unless the user explicitly asks. Never `git push --force` (blocked by the pre-bash hook for shared refs anyway). Never use `--no-verify`.
- **Read-only agents** that need to leave findings on a PR use `gh pr comment` or `gh pr review`; they never push commits.
