---
paths:
  - 'apps/server/src/redis.ts'
  - 'apps/server/src/queue.ts'
  - 'apps/server/src/plugins/redis.plugin.ts'
  - 'libs/redis/**'
---

# Redis

Redis access is provided by the **`@nebula-chat/redis`** lib, registered by
`plugins/redis.plugin.ts` and reached through `@server/redis` (`src/redis.ts`). See
[ADR-0009](../../docs/adr/0009-nebula-chat-redis-lib.md). The server uses it for:

- **better-auth's secondary storage** (`authStore`, ADR-0010) and **runtime log levels** (`pubsub`, ADR-0020).
- **Reply streams** (`streams`, ADR-0014): the relay tails a stream over a dedicated connection
  (`openReplyStream`), since a blocking `XREAD` ties its connection up.
- **Stream owners**: `saveStreamOwner` / `findStreamOwner` record who may read a stream
  (`stream-owner:{streamId}`, 24-hour TTL). The assistant Message only exists once the worker finishes it,
  so the owner check cannot go through Postgres.
- **Resume and cancel** (NEB-355): `saveActiveStream` / `findActiveStream` keep each Session's in-flight
  reply (`session-stream:{sessionId}`) for `GET /api/sessions/:id`'s `activeStreamId`; `isStreamExpired`
  reads the worker's `stream-ended:{streamId}` flag against the stream's existence, so an expired stream
  404s while a queued one waits; `requestStreamCancel` raises `stream-cancel:{streamId}` for the worker.
- **The Direct reply queue** (`src/queue.ts`): a BullMQ `Queue` on `redis.dedicatedConnection()`, built on
  first use so nothing that only builds the app (the OpenAPI script, route tests) opens a connection.

The connection is lazy with no offline queue, so a command sent before it is ready is rejected.
`server.ts` therefore calls `redis.connect()` at startup without awaiting it (a failure logs
`redis.connect.failed` while ioredis keeps retrying), and the `authStore` and stream-owner helpers await
that same connect before each command.

**The response cache is off.** The server's cache hooks were removed with the move to the worker
(ADR-0013); caching Direct replies comes back in the worker through the `cache` primitive.
