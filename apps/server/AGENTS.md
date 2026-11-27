# AGENTS.md — Backend (`@nebula-chat/server`)

Conventions specific to the Fastify API. See the [root AGENTS.md](../../AGENTS.md) for monorepo-wide commands, git workflow, and cross-cutting rules (no barrels, `type` not `interface`, arrow functions) that also apply here.

How a request moves through the plugins and route gates, the data model and the Direct reply flow are
drawn in [docs/architecture.md](../../docs/architecture.md); auth flows in [docs/auth.md](../../docs/auth.md).

---

## Commands

Run from `apps/server` (or `pnpm --filter @nebula-chat/server run <cmd>` from the root):

```bash
pnpm dev              # nodemon (see nodemon.json): restarts on src, .env and built lib changes — assumes lib artifacts already built
pnpm start            # node dist/src/server.js (production)
pnpm generate:openapi # regenerate openapi/openapi.yaml from live route schemas
```

`generate:openapi` needs no `.env` and no env vars. It fills a placeholder for every var `src/env.ts` requires before loading the app, a real var always wins, and no database or Redis connection is opened. The output does not depend on the environment.

`build` and `typecheck` must run via Turbo from the repo root, so workspace lib artifacts (`dist/*.d.ts`) build first: `pnpm turbo run build --filter=@nebula-chat/server` (and `typecheck` likewise).

**`@nebula-chat/db` migrations** (`libs/db` has no separate AGENTS.md):

```bash
pnpm --filter @nebula-chat/db db:push      # sync schema to local DB without migration files (dev)
pnpm --filter @nebula-chat/db db:generate  # generate SQL migration files from schema changes
pnpm --filter @nebula-chat/db db:migrate   # apply pending migration files (production)
pnpm --filter @nebula-chat/db db:baseline  # report journal state; --apply marks existing migrations applied
pnpm --filter @nebula-chat/db db:studio    # open Drizzle Studio GUI
```

`DATABASE_URL` lives in `apps/server/.env`, which the server's `dev`/`start` scripts and every `db:*`
script load through `dotenvx run` — single source of truth (see [server-env](../../.claude/rules/server-env.md)).
`db:migrate` calls the drizzle-orm migrator directly (`src/migrate.ts`) rather than `drizzle-kit migrate`, which exits 1 without printing the underlying Postgres error. `db:baseline` is for a database whose schema predates the migration journal: it reports what it would do and only writes with `--apply`.

---

## Directory Layout

`src/` is `app.ts` (the `buildApp()` factory), `server.ts` (entry: `listen` plus signal handling), `env.ts`
(the only `process.env` reader), singletons (`db.ts`, `redis.ts`, `queue.ts`, `auth.ts`, `logger.ts`) and:

- `modules/<name>/` — one 6-layer module each (below): `chat`, `stream`, `session`, `message`,
  `models`, `profileImage`, `logLevel`, `admin` (the Operator's `/api/internal/admins` and the Admin's `/api/admin/users`: list, read, restore, grant or revoke Admin, ban and unban, a User's Sessions; the audited `/api/admin/sessions/:id`,
  `/api/admin/runs` (every User's Runs, owner email left out; opening one is the audited `GET /api/runs/:runId`), `/api/admin/overview`: activity KPIs from Users and Messages, and `/api/admin/log-levels`: the audited Admin path to the `logLevel` service), `audit` (the Audit log
  writer and `GET /api/admin/audit`),
  `usage` (`/api/admin/usage/{series,detail,totals}`: per-Model prompts, tokens and estimated spend per UTC day from user Messages and the Model call ledger),
  `run` (`GET /api/runs/:runId`: a Run with its Brief and Steps for its owner, or for an Admin, whose read is audited; and the service that cancels Runs waiting on a Clarifying question: stop,
  Archive, Ban), and `user` (only a repository so far: the send path records `lastActiveAt`), `modelCall` (only a repository: the Spend allowance's monthly cost sum, Own-key calls excluded), and `ownKey` (`/api/own-keys`: Own keys encrypted to the worker public key, and the selection that picks the key reference sent at enqueue).
  A module may add hooks (`*.hook.ts`) and helpers beside its layers.
- `plugins/` — Fastify plugins: request logging,
  `originAuth` (403 for a request without Cloudflare's `X-Origin-Auth`, [docs/origin-access.md](../../docs/origin-access.md)),
  `db`, `redis`, `rateLimit` (the limiter, keyed on `CF-Connecting-IP`), `privilegedRoutes` (the `/api/internal/*` and `/api/admin/*` scopes with their rate limits), and `authGate` (mounts `/api/auth/*` and answers `/api/auth/admin/*`, dot segments resolved, with NotFound; `@nebula-chat/auth` refuses them too,
  its `onRoute` hook attaches the gate for each route's Access level and fails boot on a route without one; also exports `isActingAdmin` for a route an Admin may use more widely than a User).
- `errors/` — the global error handler. `config/` — CORS allowlist, SSE headers, pagination. Security headers (helmet) and the mutation Origin check are root plugins in `plugins/`. `utils/` — small shared helpers,
  including `operatorGate.hook.ts` (`requireOperator`, the gate of the `operator` Access level).
- `test/` — the shared harness (`createTestApp`, in-memory pub/sub, reply streams, profile image store).

Redis lives in the `@nebula-chat/redis` lib ([ADR-0009](../../docs/adr/0009-nebula-chat-redis-lib.md)),
registered by `plugins/redis.plugin.ts`, which closes the job queue and then the toolkit on shutdown.

---

## Module Pattern

Every feature module follows this strict 6-layer convention. Add files in this order when creating a new module:

```text
1. <module>.types.ts        — TypeScript types / DTOs (no logic)
2. <module>.validation.ts   — Zod schemas for request body/params/query/response
3. <module>.repository.ts   — Raw Drizzle queries; no business logic (omit if no DB access)
4. <module>.service.ts      — Business logic; calls repository; never touches req/res
5. <module>.controller.ts   — Calls service; builds HTTP response; minimal logic
6. <module>.routes.ts       — FastifyPluginCallbackZodOpenApi default export; schema blocks + hook chain
```

New modules must be mounted in `buildApp()` in `src/app.ts` via `app.register(plugin, { prefix: '/api/<module>' })`.
The one exception is `chat`, mounted at `/api`: sending lives under the Session it goes to
(`/api/sessions/:sessionId/messages`, ADR-0014). No separate OpenAPI registry step — the `schema:` block on each route is the single source of truth for both validation and documentation.

**`app.ts` is wiring only.** It registers plugins and route modules in order, so nothing new grows it: option objects, key generators, limit constants and groups of scoped routes go in a plugin under `plugins/` (or a helper under `utils/`) that `app.ts` imports and registers. A new route module is the one line it gains.

---

## Topic rules

Each topic lives in a path-scoped rule under [`.claude/rules/`](../../.claude/rules/). Claude Code loads one
when it reads a matching file; any other agent opens the file when it works in that area.

| Rule                                                                  | Covers                                                     |
| --------------------------------------------------------------------- | ---------------------------------------------------------- |
| [server-error-handling](../../.claude/rules/server-error-handling.md) | `AppError` classes, the error envelope, the global handler |
| [server-logging](../../.claude/rules/server-logging.md)               | `logEvent`, `req.log`, what never to log                   |
| [server-access](../../.claude/rules/server-access.md)                 | Access levels: every route declares one, deny by default   |
| [server-validation](../../.claude/rules/server-validation.md)         | Zod schemas, `jsonResponse`, route `schema:` blocks        |
| [server-database](../../.claude/rules/server-database.md)             | Drizzle schema, repositories, migrations                   |
| [server-redis](../../.claude/rules/server-redis.md)                   | `@nebula-chat/redis` use, stream owners, the reply queue   |
| [server-messaging](../../.claude/rules/server-messaging.md)           | Sending a Message and relaying its reply stream            |
| [server-openapi](../../.claude/rules/server-openapi.md)               | Spec generation and regenerating the API clients           |
| [server-env](../../.claude/rules/server-env.md)                       | `.env` loading, `env.ts`, every variable                   |
| [server-testing](../../.claude/rules/server-testing.md)               | Backend test commands, `app.inject()`, mocking boundaries  |

## Path Aliases

The backend uses `@server/*` as a path alias for `src/*`:

```ts
import { db } from '@server/db';
import { errorHandler } from '@server/errors/error.handler';
```

Never use relative paths in the backend. Aliases are configured in `tsconfig.json` and resolved at build time by `tsc-alias`.

Static imports stay extensionless. A dynamic `import()` needs a `.js` extension (`await import('@server/app.js')`): under `"module": "node20"` it is emitted as a real ESM import, which resolves like ESM.
