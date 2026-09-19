# Nebula Chat — Backend Stack Migration

> **Agent instruction:** This directory contains the full backend migration spec. Each file is a self-contained ticket. Read this README first for context and implementation order, then open the relevant ticket file.

## Document index

| File                                                   | Ticket | Description                                                         | Depends on         |
| ------------------------------------------------------ | ------ | ------------------------------------------------------------------- | ------------------ |
| [TICKET-M1-fastify.md](./TICKET-M1-fastify.md)         | M-1    | Replace Express with Fastify                                        | Nothing — do first |
| [TICKET-M2-db.md](./TICKET-M2-db.md)                   | M-2    | `@nebula-chat/db` — Drizzle ORM (replaces Prisma)                   | Nothing            |
| [TICKET-M3-langchain.md](./TICKET-M3-langchain.md)     | M-3    | `@nebula-chat/langchain` — LangChain lib (replaces openai)          | Nothing            |
| [TICKET-M4-redis.md](./TICKET-M4-redis.md)             | M-4    | `@nebula-chat/redis` — shared Redis substrate (replaces bare redis) | M-5 (otel)         |
| [TICKET-M5-otel.md](./TICKET-M5-otel.md)               | M-5    | `@nebula-chat/otel` — Pino + OpenTelemetry                          | Nothing            |
| [TICKET-M6-auth.md](./TICKET-M6-auth.md)               | M-6    | `@nebula-chat/auth` — better-auth (sessions, anonymous, claim)      | M-1, M-2, M-4      |
| [TICKET-M7-queues.md](./TICKET-M7-queues.md)           | M-7    | Background jobs — BullMQ + dashboard                                | M-1, M-3           |
| [TICKET-M8-realtime.md](./TICKET-M8-realtime.md)       | M-8    | Real-time — SSE streaming + WebSockets                              | M-1                |
| [TICKET-M9-testing.md](./TICKET-M9-testing.md)         | M-9    | Testing — Vitest, Supertest, testcontainers, msw                    | M-1                |
| [TICKET-M10-resilience.md](./TICKET-M10-resilience.md) | M-10   | Resilience — circuit breaker with cockatiel                         | M-3                |

## Full package migration summary

| Action | From                                             | To                                               | Notes                                                         |
| ------ | ------------------------------------------------ | ------------------------------------------------ | ------------------------------------------------------------- |
| Remove | `express`, `@types/express`                      | `fastify` + plugins                              | Core framework                                                |
| Remove | `openai`                                         | `@langchain/openai` via `@nebula-chat/langchain` | LLM client                                                    |
| Remove | `prisma`, `@prisma/client`, `@prisma/adapter-pg` | `drizzle-orm` + `pg`                             | ORM                                                           |
| Remove | `redis` (bare client)                            | `ioredis` (via `@nebula-chat/redis`)             | Shared Redis substrate; single-tier, no `lru-cache` (see M-4) |
| Remove | `express-rate-limit`                             | `@fastify/rate-limit` + `@upstash/ratelimit`     | Rate limiting                                                 |
| Remove | `swagger-ui-express`                             | `@fastify/swagger` + `@fastify/swagger-ui`       | API docs                                                      |
| Remove | `cors`                                           | `@fastify/cors`                                  | CORS                                                          |
| Keep   | `zod`                                            | —                                                | No change                                                     |
| Keep   | `@asteasolutions/zod-to-openapi`                 | —                                                | No change                                                     |
| Keep   | `tiktoken`                                       | —                                                | No change                                                     |
| Keep   | `dotenv`, `tsx`, `tsc-alias`                     | —                                                | No change                                                     |
| Add    | —                                                | `bullmq`, `@bull-board/fastify`                  | Job queue                                                     |
| Add    | —                                                | `pino`, `pino-http`                              | Structured logging                                            |
| Add    | —                                                | `@opentelemetry/*` (3 packages)                  | Distributed tracing                                           |
| Add    | —                                                | `langsmith`                                      | LLM observability                                             |
| Add    | —                                                | `better-auth` (via `@nebula-chat/auth`)          | Auth substrate (M-6) — sessions, hashing, anonymous, claim. Replaces the old `jose`/`argon2`/`@fastify/jwt`/`@fastify/oauth2` plan |
| Add    | —                                                | `@fastify/helmet`, `@fastify/csrf-protection`    | Security headers (optional M-6 follow-up)                     |
| Add    | —                                                | `cockatiel`                                      | Circuit breaker                                               |
| Add    | —                                                | `vitest`, `supertest`, `testcontainers`, `msw`   | Testing                                                       |
| Add    | —                                                | `@fastify/websocket`                             | WebSockets                                                    |

## Target monorepo structure

```text
nebula-chat/
├── apps/
│   ├── server/                    # nebula-chat-server (this migration)
│   │   └── src/
│   │       ├── modules/
│   │       │   ├── chat/
│   │       │   │   ├── chat.routes.ts
│   │       │   │   ├── chat.service.ts
│   │       │   │   └── chat.schema.ts
│   │       │   ├── auth/
│   │       │   └── users/
│   │       ├── plugins/
│   │       │   ├── auth.plugin.ts
│   │       │   ├── cache.plugin.ts
│   │       │   ├── db.plugin.ts
│   │       │   └── otel.plugin.ts
│   │       ├── workers/
│   │       │   ├── queues.ts
│   │       │   └── llm.worker.ts
│   │       ├── server.ts
│   │       └── env.ts
│   └── client/                    # no changes in this migration
├── libs/
│   ├── langchain/                 # @nebula-chat/langchain
│   ├── redis/                     # @nebula-chat/redis
│   ├── otel/                      # @nebula-chat/otel
│   ├── db/                        # @nebula-chat/db
│   └── api/                       # @nebula-chat/api
├── docker/
│   └── docker-compose.yml
└── package.json
```

## Recommended implementation order

Lib tickets (M-2 through M-5) are fully independent and can run in parallel. App tickets require M-1.

**Status as of 2026-09-14.** M-3 was implemented ahead of M-5 and M-4, so the original order no longer
reads as a to-do list. The `Done` column is the source of truth; **tick it in the same PR that implements the
ticket** — M-5 merged with its row left blank, which is how this table goes stale.

| Order | Ticket          | Done | Reason                                                           |
| ----- | --------------- | ---- | ---------------------------------------------------------------- |
| 1     | M-1 Fastify     | ✅   | Core — everything else plugs into it                             |
| 2     | M-2 DB          | ✅   | Database access needed by most features                          |
| 3     | M-3 LangChain   | ✅   | Core feature of the app (landed out of order, before M-5)        |
| 4     | M-5 OTel        | ✅   | One logger seam before every later ticket adds log sites         |
| 5     | M-9 Testing     | ✅   | **Moved up from 7** — see below                                  |
| 6     | M-4 Redis       |      | Shared Redis substrate; single-tier cache first (needs M-5 otel) |
| 7     | M-6 Auth        |      | better-auth accounts + metered-anonymous; consumes M-2 & M-4     |
| 8     | M-7 Queues      |      | Background jobs for long LLM calls                               |
| 9     | M-8 Real-time   |      | Streaming and presence                                           |
| 10    | M-10 Resilience |      | Add last — wraps existing LLM calls                              |

### Why M-9 moved up

The repo had **no test infrastructure at all**: no `vitest`, `supertest`, or `testcontainers` in any
`package.json`, no `*.test.ts` or `*.spec.ts` files, no vitest config, and no `test` script anywhere —
while `turbo.json` already declared a `test` task that nothing implements. M-1, M-2, M-3 and M-5 all
shipped without tests as a result, and the repo's own agent workflow (`/implement` drives `/tdd`
internally) had no red-green loop to run.

M-9 therefore goes ahead of M-4 and M-6, because those two are the first remaining tickets with logic
genuinely worth testing: M-4's L1/L2 promotion path and M-6's password hashing are exactly the things you
do not want to ship unverified.

**M-9 was rewritten and rescoped on 2026-09-14** — see [ADR-0008](../adr/0008-vitest-unit-testing-with-an-enforced-coverage-gate.md).
It is unit-tests-only (no testcontainers, no supertest, no autocannon), it covers **all five packages**
rather than the server alone, and it lands an enforced **80% coverage gate** so the bar cannot quietly
erode the way it did over the previous four tickets.

## Ticket independence rules

- **Lib tickets (M-2, M-3, M-5)** can be implemented in any order and merged independently. **M-4 (`@nebula-chat/redis`)** now depends on M-5 (otel) — it logs and emits metrics exclusively through `@nebula-chat/otel` — so M-4 lands after M-5 (already merged). See [TICKET-M4-redis.md](./TICKET-M4-redis.md).
- **App tickets (M-6, M-7, M-8, M-9, M-10)** require M-1 (Fastify) to be complete. **M-6 (`@nebula-chat/auth`)** additionally depends on M-2 (`@nebula-chat/db`, for the auth schema) and M-4 (`@nebula-chat/redis`, for session/rate-limit storage) — both merged. See [TICKET-M6-auth.md](./TICKET-M6-auth.md) and [ADR-0010](../adr/0010-better-auth-for-auth.md).
- **M-7 (Queues)** works without M-3 (LangChain lib) by calling OpenAI directly as a temporary measure, but should be updated to use `@nebula-chat/langchain` once M-3 is merged.
- **M-9 (Testing)** infrastructure can be set up any time. Tests for a specific feature should be written in the same PR as that feature.

## `allowBuilds` update

After removing Prisma, update `pnpm-workspace.yaml` (pnpm v11 removed
`pnpm.onlyBuiltDependencies` from `package.json` in favour of `allowBuilds`):

```yaml
allowBuilds:
  esbuild: true
  argon2: true
```

Remove `@prisma/engines` and `prisma`. Add `argon2` (requires native compilation).
