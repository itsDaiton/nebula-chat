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
  `models`, `profileImage`, `logLevel`, `admin` (the Operator's `/api/internal/admins` and the Admin's `/api/admin/users`: list, read, restore, grant or revoke Admin, ban and unban, a User's Sessions; and the audited `/api/admin/sessions/:id`), `audit` (the Audit log
  writer and `GET /api/admin/audit`), `run` (a repository, and the service that cancels Runs waiting on a Clarifying question: stop, Archive, Ban), and `user` (only a repository so far: the send path records `lastActiveAt`). A module may add hooks (`*.hook.ts`) and helpers beside its layers.
- `plugins/` — Fastify plugins: request logging, `db`, `redis`, and `authGate` (mounts `/api/auth/*` and answers `/api/auth/admin/*` with NotFound,
  decorates `requireAuthentication` / `requireRegistered`; also exports `requireAdmin` for `/api/admin/*`).
- `errors/` — the global error handler. `config/` — CORS, SSE headers, pagination. `utils/` — small shared helpers,
  including `operatorGate.hook.ts` (`requireOperator`, the operator-token gate on every `/api/internal/*` route).
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

---

## Topic rules

Each topic lives in a path-scoped rule under [`.claude/rules/`](../../.claude/rules/). Claude Code loads one
when it reads a matching file; any other agent opens the file when it works in that area.

| Rule                                                                  | Covers                                                     |
| --------------------------------------------------------------------- | ---------------------------------------------------------- |
| [server-error-handling](../../.claude/rules/server-error-handling.md) | `AppError` classes, the error envelope, the global handler |
| [server-logging](../../.claude/rules/server-logging.md)               | `logEvent`, `req.log`, what never to log                   |
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
