---
paths:
  - 'apps/server/src/**/*.repository.ts'
  - 'apps/server/src/db.ts'
  - 'libs/db/**'
---

# Database — Drizzle

Schema lives at `libs/db/src/schema.ts` (`@nebula-chat/db`). The domain tables are `users`, `sessions`, `messages`; better-auth owns `session`, `account`, and `verification` (see [ADR-0010](../../docs/adr/0010-better-auth-for-auth.md)). `sessions.userId` is **NOT NULL** — every session has an owner. See [GLOSSARY.md](../../GLOSSARY.md) for the domain vocabulary.

**Rules:**

- All Drizzle queries go in `*.repository.ts` files — never in services or controllers.
- The DB client is created in `src/db.ts` via `createDbClient` from `@nebula-chat/db`. Always import `db` from `@server/db`.
- After changing the schema run `pnpm --filter @nebula-chat/db db:generate` in dev or `pnpm --filter @nebula-chat/db db:migrate` in prod. Never edit an applied migration; write a follow-up one, and use `db:generate`, not `db:push`, whenever production needs the change.
- Sessions are cursor-paginated using the session `id` as the cursor.
- The server loads no chat history: the worker loads the last 20 Messages into a Direct reply's context.
