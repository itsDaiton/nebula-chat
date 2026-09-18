# M-4 — `@nebula-chat/redis` (shared Redis substrate; replaces the bare `redis` package)

> **Status:** Spec rewritten 2026-09-16 after a `/grill-with-docs` session. This supersedes the
> original `TICKET-M4-cache.md`, which specified a two-tier LRU+ioredis cache and did not know that a
> full cache module already exists in `apps/nebula-chat-server/src/cache/`. Treat the old ticket's code
> snippets as discarded. Backing decision: [ADR-0009](../adr/0009-nebula-chat-redis-lib.md).

## Ticket metadata

| Field          | Value                                               |
| -------------- | --------------------------------------------------- |
| **ID**         | M-4                                                 |
| **Package**    | `libs/redis` → published as `@nebula-chat/redis`    |
| **Depends on** | `@nebula-chat/otel` (M-5, merged) — hard dependency |
| **Blocks**     | Nothing (but M-6/M-7/M-8 will extend this lib)      |
| **Standalone** | Yes                                                 |

---

## Problem Statement

The server caches LLM chat responses today, but the implementation is a liability. It lives in
`apps/nebula-chat-server/src/cache/` on the **bare `redis` package**, and it is bloated in ways that
actively cost us: it hand-rolls a capped keys-list with FIFO eviction, maintains its own hit/miss/eviction
stats blob in Redis, and exposes HTTP admin endpoints (`cache.routes.ts` / `cache.controller.ts`) for
stats/clear/keys. None of that is shared, none of it is reusable, and all of it has to be maintained by
hand.

Meanwhile the upcoming migration tickets each need Redis for something the current module can't give them:
M-7 (Queues) needs a raw connection for BullMQ, M-8 (Real-time) needs pub/sub, and M-6 (Auth) will want
rate-limiting and session storage. If each ticket reaches for Redis independently, we end up with several
clients, several connection/lifecycle strategies, and several logging conventions scattered across the app.

The developer wants a single, well-shaped **shared Redis layer** — a first-party lib that owns the
connection(s) and exposes clean primitives — so that today's chat caching is correct and small, and future
features (queues, pub/sub, rate-limit, locks) slot in without re-litigating how the app talks to Redis.

## Solution

Create `libs/redis`, published as `@nebula-chat/redis`: a first-party lib that names the shared Redis
**substrate** (not just "cache", because it will do more than cache). A single `createRedis(config)` factory
returns a namespaced toolkit over an internally-managed set of connections. The **only** capability built now
is the `cache` primitive plus a raw `connection` accessor; pub/sub, streams, rate-limit, and locks are
designed-for but **not built** until a real consumer (M-6/M-7/M-8) exists.

The server's chat cache hooks are rewired onto `redis.cache`, the old `src/cache/` module and the bare
`redis` dependency are deleted, and all logging + metrics flow through `@nebula-chat/otel`. This is a
**redesign**, not a lift — the old fail-open behavior is the one thing kept; the stats blob, FIFO keys-list,
and HTTP admin endpoints are dropped.

## User Stories

1. As a **backend developer**, I want one `createRedis(config)` factory, so that I get a working Redis toolkit without wiring connections, reconnect strategies, or error handling by hand.
2. As a **backend developer**, I want the factory to expose a `cache` primitive with `get`/`set`/`del`/`clear`, so that I can cache values without touching raw Redis commands.
3. As a **backend developer**, I want a raw `connection` accessor on the toolkit, so that BullMQ (M-7) and other libraries that need a real ioredis instance can be handed one.
4. As a **backend developer**, I want the toolkit to expose a single `close()`, so that graceful shutdown tears down every connection it owns in one call from the Fastify `onClose` hook.
5. As a **backend developer**, I want the lib to own its key/namespace naming scheme in one configured place, so that key formats are consistent and I don't hand-build key strings at call sites.
6. As a **chat user**, I want a repeat request to be served from cache, so that I get an instant response and we avoid a redundant LLM call.
7. As a **chat user**, I want a cache hit to arrive as the same SSE stream shape as a live response (including the `cache-hit` event), so that the client renders it identically whether or not it was cached.
8. As a **chat user**, I want to **regenerate** a response and get a fresh completion, so that "regenerate" bypasses the cached entry and overwrites it rather than replaying the old answer.
9. As a **chat user**, I want chat to keep working even when Redis is down, so that a cache outage degrades to a normal (uncached) response instead of an error — the cache is **fail-open**.
10. As an **operator**, I want cache hit/miss to appear as OpenTelemetry metrics, so that I can observe cache effectiveness without a bespoke stats endpoint.
11. As an **operator**, I want Redis memory bounded by per-key TTL plus the server's `maxmemory-policy`, so that the keyspace can't grow without limit and I don't rely on app-side eviction bookkeeping.
12. As a **future feature developer (M-8 real-time)**, I want to add a `pubsub` primitive to the same toolkit, so that presence/streaming reuses the shared connection manager instead of opening its own client.
13. As a **future feature developer (M-7 queues)**, I want a BullMQ-ready connection from the toolkit, so that job queues share the app's Redis lifecycle.
14. As a **future feature developer (M-6 auth)**, I want to add `rateLimit` and session storage primitives, so that auth throttling and sessions build on the same substrate.
15. As a **maintainer**, I want the old `src/cache/` module, its tests, and the bare `redis` dependency removed, so that there is exactly one way the app talks to Redis.
16. As a **maintainer**, I want the lib to depend on `@nebula-chat/otel` for all logging, so that no `console.*` or app-logger import leaks into a shared library.
17. As a **release manager**, I want `@nebula-chat/redis` registered in `release-please-config.json` with its own component, so that it versions and releases like the other libs.

## Implementation Decisions

### Package & tooling

- New package `libs/redis`, name `@nebula-chat/redis`, published to the GitHub registry with `access: restricted`, matching the other libs.
- Build with **`tsup`**, use the `catalog:` protocol for shared dev deps (`typescript`, `vitest`, `@vitest/coverage-v8`, `@types/node`), mirroring `libs/otel`'s `package.json`.
- Runtime deps: **`ioredis`** and `@nebula-chat/otel` (`workspace:*`). **`lru-cache` is NOT a dependency** — the two-tier L1 is dropped (see below).
- New-lib plumbing (required, in this order): add `.gitignore` (`dist/`, `node_modules/`); add a `libs/redis` entry to `release-please-config.json` with `component: nebula-chat-redis` and `include-component-in-tag: true`; then commit + push.

### Client: `ioredis`, not node-`redis`

Switch off the bare `redis` package to **`ioredis`**. Rationale: the shared-connection design only holds if every consumer speaks one client, and BullMQ (M-7) prefers ioredis; ioredis also has the cleaner pub/sub and atomic-Lua (`defineCommand`) story that M-6/M-8 will want. (BullMQ ships a node-redis adapter now, so this is "preferred," not "forced" — but the redesign reaches for ioredis features regardless.)

### Factory shape: one factory, namespaced toolkit, internal connection manager

- Public API is **one** `createRedis(config)` that returns a toolkit object exposing:
  - `cache` — the cache primitive (built now).
  - `connection` — a raw ioredis instance for libraries like BullMQ (exposed now; no consumer until M-7).
  - `close()` — tears down every connection the toolkit owns.
  - Reserved seams (designed-for, **not built**): `pubsub`, `streams`, `rateLimit`, `lock`.
- Internally the factory owns a **connection manager**. It is not literally one connection: Redis subscriber mode monopolizes a connection and BullMQ wants its own connection configured with `maxRetriesPerRequest: null`, and blocking stream consumers behave like subscribers. So the manager provisions a **main command connection** now, and is structured to hand out a **lazily-created subscriber connection** and **BullMQ-ready connections** when those primitives land. Callers never see this — they ask for a primitive, the manager supplies the right connection.
- Primitives take an injected connection **internally** (for testability); the single-factory ergonomics are the public contract.
- `config` accepts at minimum: `redisUrl`, an injected **`logger`** (`@nebula-chat/otel` `Logger`), and cache defaults (default TTL, namespace config). It must not read `process.env` directly — the app passes values in.

### The `cache` primitive (single-tier)

- **Single-tier: Redis only.** The two-tier in-process LRU (L1) from the old ticket is dropped. On the current single-instance deployment L1 would be safe but adds invalidation complexity and becomes a stale-read footgun the moment the app scales horizontally. If a specific hot path ever proves it needs L1, add it as an **opt-in wrapper**, never as a baked-in default.
- Public methods: `get`, `set` (with optional per-call TTL), `del`, `clear`. Values are JSON-serialized.
- **The lib owns key naming**: the primitive is namespaced (`namespace:key`) and the namespace/key scheme is configured inside the lib, not assembled at call sites.
- **Fail-open is mandatory and is the one behavior kept from the old module**: any Redis error on read degrades to a cache **miss** (`get` → null), and on write degrades to a **no-op** — errors are logged via the injected OTel logger and never propagate. Chat must never break because Redis is unavailable.
- **Eviction/bounding**: per-key **TTL** plus reliance on Redis's own **`maxmemory-policy` (`allkeys-lru`)**. No hand-rolled keys-list, no FIFO bookkeeping, no `maxItems`. **Ops check (flag, not a blocker):** confirm the managed Redis allows setting `maxmemory-policy`; if it does not, fall back to an atomic sorted-set + Lua trim inside the primitive.

### Observability: everything through `@nebula-chat/otel`

- All logging goes through the injected OTel `Logger`. **No `console.*`, no `@backend/logger` import.**
- Cache **hit/miss** are emitted as **OpenTelemetry metrics** (counters) via `@opentelemetry/api` `getMeter`. Note: `@nebula-chat/otel` currently exports only `createLogger` + `initTelemetry` (no metrics factory), so the lib uses `@opentelemetry/api` directly for now; adding a metrics factory to `@nebula-chat/otel` is an **optional follow-up**, not part of this ticket.
- The hand-rolled stats blob (`cache:stats`) and the HTTP admin endpoints (stats/clear/keys) are **removed**. A real admin dashboard is a later concern and will read OTel metrics / a future BullMQ board. `clear()`/`del()` remain as **programmatic** operations only.

### Cache key semantics — KEPT AS-IS for this ticket

- The current key is retained verbatim: **`conversationId + model + hash(last user message)`** (SHA-256 of the last user message content, truncated). This matches the existing CONTEXT.md "Cache entry" definition, so **CONTEXT.md needs no change** and the lib introduces no new domain vocabulary (it is infrastructure).
- This key is known to be imperfect (it ignores full conversation history and scopes by conversation). Correcting it — hashing the full `messages` array + `model` + `temperature` + `systemPrompt`, dropping `conversationId`, and any semantic/embedding-based caching — is **explicitly deferred to a separate future ticket** (see Out of Scope). Do **not** change the key here.

### Regenerate behavior (new)

- A **regenerate** request **bypasses** the cached entry (does not replay) and **overwrites** it with the fresh completion. This is the one behavioral change shipped now, independent of the key rework.

### Server rewiring (the MVP / first-PR slice)

The first PR is exactly this slice — no speculative capability:

1. Add `libs/redis` (connection manager + `cache` primitive + `connection` accessor + `close()`).
2. Add a Fastify **`cache.plugin.ts`** (or `redis.plugin.ts`) that calls `createRedis`, decorates the app, and tears down on `onClose`.
3. Rewire `chat.cacheCheck.hook.ts` and `chat.streamCapture.hook.ts` onto `redis.cache` (preserving the SSE replay shape: `conversation-created`, `user-message-created`, `cache-hit`, tokens, `usage`, `assistant-message-created`, `end`), and implement regenerate-bypass.
4. **Delete** `apps/nebula-chat-server/src/cache/` (client, service, config, types, validation, controller, routes, and their tests) and any cache admin route registration.
5. Remove the bare **`redis`** dependency from `apps/nebula-chat-server/package.json`; run `pnpm install`; confirm no `from 'redis'` imports remain.

## Testing Decisions

Good tests here assert **external behavior**, never implementation details (not the stats blob, not which connection served a call, not that a metric fired). Two seams — one existing, one new — carry the M-9 **80% coverage gate**:

1. **Chat route (integration, existing seam) — primary.** Extend `apps/nebula-chat-server/src/modules/chat/tests/chat.routes.test.ts`, which already drives the route via Fastify **`app.inject()`** against a real `buildApp()` with the repository layer mocked (prior art: the existing chat and message route tests). Assert the client-observable behavior:
   - cache **miss** → LLM stream flows and is captured;
   - identical request → cache **hit** → verbatim SSE replay including the `cache-hit` event;
   - **regenerate** → bypass + overwrite (fresh completion, cache updated);
   - Redis failure → request still succeeds uncached (**fail-open**).
2. **`cache` primitive (unit, new seam) in `libs/redis`.** Vitest unit tests against a mocked ioredis (e.g. `ioredis-mock` or a hand fake), one test file per module in a `tests/` folder beside the source (repo convention). Cover: `get`/`set`/`del`/`clear`, namespace prefixing, per-call TTL passthrough, and **fail-open** (a connection whose commands throw → `get` returns null, `set` is a no-op, nothing propagates).

Not tested (deliberately): the connection manager's lazy-subscriber/BullMQ paths (no consumer yet — out of scope), and OTel metric emission (asserted as hit/miss _behavior_ at seam #1, not by inspecting counters). The old module's `cache.service`/`cache.client`/`cache.routes` tests are deleted with the module; seams #1 + #2 replace their coverage.

Consistent with **ADR-0008**: unit tests only, no testcontainers, no live database, no `supertest`.

## Out of Scope

- **Any change to the cache key** — full-context hashing, dropping `conversationId`, including `temperature`/`systemPrompt`, and semantic/embedding-based caching are a **separate future ticket**.
- **Building** pub/sub, Redis streams, rate-limiting, or distributed locks. These are _designed-for_ seams only; each lands with its consuming ticket (M-6/M-7/M-8).
- Wiring BullMQ itself (M-7) — this ticket only exposes the `connection` accessor it will use.
- An opt-in L1 in-process LRU wrapper — added later only if a hot path proves it needs it.
- A cache admin dashboard / HTTP admin surface — a later concern.
- Adding a metrics factory to `@nebula-chat/otel` — optional follow-up.

## Further Notes

- Backing decision recorded in [ADR-0009](../adr/0009-nebula-chat-redis-lib.md): naming the lib after the technology, single-tier over two-tier, the hard OTel coupling, and redesigning over lifting the existing module.
- Deployment reality that informed "single-tier" and "TTL + maxmemory-policy": the server runs as a **single** Render web instance (free plan, no `numInstances`/scaling).
- Keep the M-9 suite green throughout — it is the regression net for the hook rewire.
