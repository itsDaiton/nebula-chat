# Nebula Chat — Backend Stack Migration

> **Agent instruction:** This directory contains the full backend migration spec. Each file is a self-contained ticket. Read this README first for context and implementation order, then open the relevant ticket file.

## Document index

| File                                                   | Ticket | Description                                                 | Depends on         |
| ------------------------------------------------------ | ------ | ----------------------------------------------------------- | ------------------ |
| [TICKET-M1-fastify.md](./TICKET-M1-fastify.md)         | M-1    | Replace Express with Fastify                                | Nothing — do first |
| [TICKET-M2-db.md](./TICKET-M2-db.md)                   | M-2    | `@nebula-chat/db` — Drizzle ORM (replaces Prisma)           | Nothing            |
| [TICKET-M3-langchain.md](./TICKET-M3-langchain.md)     | M-3    | `@nebula-chat/langchain` — LangChain lib (replaces openai)  | Nothing            |
| [TICKET-M4-cache.md](./TICKET-M4-cache.md)             | M-4    | `@nebula-chat/cache` — two-tier cache (replaces bare redis) | Nothing            |
| [TICKET-M5-otel.md](./TICKET-M5-otel.md)               | M-5    | `@nebula-chat/otel` — Pino + OpenTelemetry                  | Nothing            |
| [TICKET-M6-auth.md](./TICKET-M6-auth.md)               | M-6    | Auth & security — JWT, argon2, OAuth2, helmet               | M-1                |
| [TICKET-M7-queues.md](./TICKET-M7-queues.md)           | M-7    | Background jobs — BullMQ + dashboard                        | M-1, M-3           |
| [TICKET-M8-realtime.md](./TICKET-M8-realtime.md)       | M-8    | Real-time — SSE streaming + WebSockets                      | M-1                |
| [TICKET-M9-testing.md](./TICKET-M9-testing.md)         | M-9    | Testing — Vitest, Supertest, testcontainers, msw            | M-1                |
| [TICKET-M10-resilience.md](./TICKET-M10-resilience.md) | M-10   | Resilience — circuit breaker with cockatiel                 | M-3                |

## Full package migration summary

| Action | From                                             | To                                               | Notes                         |
| ------ | ------------------------------------------------ | ------------------------------------------------ | ----------------------------- |
| Remove | `express`, `@types/express`                      | `fastify` + plugins                              | Core framework                |
| Remove | `openai`                                         | `@langchain/openai` via `@nebula-chat/langchain` | LLM client                    |
| Remove | `prisma`, `@prisma/client`, `@prisma/adapter-pg` | `drizzle-orm` + `pg`                             | ORM                           |
| Remove | `redis` (bare client)                            | `ioredis` + `lru-cache`                          | Cache client                  |
| Remove | `express-rate-limit`                             | `@fastify/rate-limit` + `@upstash/ratelimit`     | Rate limiting                 |
| Remove | `swagger-ui-express`                             | `@fastify/swagger` + `@fastify/swagger-ui`       | API docs                      |
| Remove | `cors`                                           | `@fastify/cors`                                  | CORS                          |
| Keep   | `zod`                                            | —                                                | No change                     |
| Keep   | `@asteasolutions/zod-to-openapi`                 | —                                                | No change                     |
| Keep   | `tiktoken`                                       | —                                                | No change                     |
| Keep   | `dotenv`, `tsx`, `tsc-alias`                     | —                                                | No change                     |
| Add    | —                                                | `bullmq`, `@bull-board/fastify`                  | Job queue                     |
| Add    | —                                                | `pino`, `pino-http`                              | Structured logging            |
| Add    | —                                                | `@opentelemetry/*` (3 packages)                  | Distributed tracing           |
| Add    | —                                                | `langsmith`                                      | LLM observability             |
| Add    | —                                                | `jose`, `argon2`                                 | JWT crypto + password hashing |
| Add    | —                                                | `@fastify/jwt`, `@fastify/oauth2`                | Auth plugins                  |
| Add    | —                                                | `@fastify/helmet`, `@fastify/csrf-protection`    | Security headers              |
| Add    | —                                                | `cockatiel`                                      | Circuit breaker               |
| Add    | —                                                | `vitest`, `supertest`, `testcontainers`, `msw`   | Testing                       |
| Add    | —                                                | `@fastify/websocket`                             | WebSockets                    |

## Target monorepo structure

```
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
│   ├── cache/                     # @nebula-chat/cache
│   ├── otel/                      # @nebula-chat/otel
│   ├── db/                        # @nebula-chat/db
│   └── api/                       # @nebula-chat/api
├── docker/
│   └── docker-compose.yml
└── package.json
```

## Recommended implementation order

Lib tickets (M-2 through M-5) are fully independent and can run in parallel. App tickets require M-1.

| Order | Ticket          | Reason                                   |
| ----- | --------------- | ---------------------------------------- |
| 1     | M-1 Fastify     | Core — everything else plugs into it     |
| 2     | M-2 DB          | Database access needed by most features  |
| 3     | M-5 OTel        | Logging needed early for debugging       |
| 4     | M-3 LangChain   | Core feature of the app                  |
| 5     | M-4 Cache       | Improves LLM response times              |
| 6     | M-6 Auth        | Protect routes before adding features    |
| 7     | M-9 Testing     | Add infrastructure before it gets harder |
| 8     | M-7 Queues      | Background jobs for long LLM calls       |
| 9     | M-8 Real-time   | Streaming and presence                   |
| 10    | M-10 Resilience | Add last — wraps existing LLM calls      |

## Ticket independence rules

- **Lib tickets (M-2, M-3, M-4, M-5)** can be implemented in any order and merged independently. They have no dependency on each other.
- **App tickets (M-6, M-7, M-8, M-9, M-10)** require M-1 (Fastify) to be complete.
- **M-7 (Queues)** works without M-3 (LangChain lib) by calling OpenAI directly as a temporary measure, but should be updated to use `@nebula-chat/langchain` once M-3 is merged.
- **M-9 (Testing)** infrastructure can be set up any time. Tests for a specific feature should be written in the same PR as that feature.

## `pnpm.onlyBuiltDependencies` update

After removing Prisma, update the root `package.json`:

```json
{
  "pnpm": {
    "onlyBuiltDependencies": ["esbuild", "argon2"]
  }
}
```

Remove `@prisma/engines` and `prisma`. Add `argon2` (requires native compilation).
