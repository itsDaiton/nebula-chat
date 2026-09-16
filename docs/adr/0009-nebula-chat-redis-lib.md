# ADR-0009: `@nebula-chat/redis` — a shared Redis substrate lib, single-tier and OTel-coupled, replacing the in-app cache module

- **Status:** Accepted — to be implemented on `feat/m-4-redis-lib`
- **Date:** 2026-09-16
- **Deciders:** @itsDaiton

## Context

Migration ticket M-4 originally specified `@nebula-chat/cache`: a two-tier cache (in-process LRU L1 backed
by ioredis L2) built from scratch. That spec was written before the code it describes existed. In reality
`apps/nebula-chat-server/src/cache/` already contains a non-trivial cache built on the **bare `redis`
package**: connection management with a reconnect strategy, fail-open GET/SET, a hand-rolled hit/miss/eviction
stats blob stored in Redis, FIFO eviction via a capped Redis list, prompt-hash key generation, and HTTP admin
endpoints (`cache.routes.ts` / `cache.controller.ts`) — wired into the chat hot path through
`chat.cacheCheck.hook.ts` and `chat.streamCapture.hook.ts`.

At the same time, the remaining migration tickets each need Redis: M-7 (Queues) needs a raw connection for
BullMQ, M-8 (Real-time) needs pub/sub, and M-6 (Auth) will want rate-limiting and session storage. Left
alone, each ticket would open its own client with its own lifecycle and logging, scattering Redis access
across the app.

A `/grill-with-docs` session resolved how to reconcile these. The disciplined question throughout was
capability vs. framework: the developer's initial instinct was "a lib that does everything Redis can do," and
grilling narrowed that to "a lib that does what our consumers actually need, with clean seams for the rest."

## Decision

Build `libs/redis`, published as **`@nebula-chat/redis`**: a shared Redis substrate exposing one
`createRedis(config)` factory that returns a namespaced toolkit (`cache`, raw `connection`, `close()`) over an
internally-managed set of connections. Only the `cache` primitive and `connection` accessor are built now;
`pubsub`/`streams`/`rateLimit`/`lock` are designed-for seams that land with their consuming tickets. Switch
from node-`redis` to **`ioredis`**. Rewire the chat hooks onto it and delete the old `src/cache/` module and
the bare `redis` dependency. Full spec: `docs/new-backend/TICKET-M4-redis.md`.

Four sub-decisions clear the "hard to reverse + surprising + real trade-off" bar and are recorded here.

### 1. Name the lib after the technology (`redis`), not the capability (`cache`)

The lib does more than cache (it will own pub/sub, queues' connection, rate-limit, locks), so `cache` is too
narrow. Naming a lib after its technology is normally an anti-pattern — it couples the name to an
implementation you might swap. Here that objection is inert: the entire purpose of the lib **is** to be the
Redis layer; we would never keep the name while removing Redis. `@nebula-chat/redis` names the shared
substrate honestly.

### 2. Single-tier (Redis only), not the two-tier L1 LRU the original ticket headlined

The server runs as a **single** Render web instance. An in-process L1 LRU would be safe there today but adds
invalidation complexity (`del` must clear both tiers) and becomes a stale-read footgun the instant the app
scales horizontally: an invalidation on one instance can't reach another instance's LRU. Rather than bake
that into every consumer, the default cache is single-tier and correct-by-default; an opt-in L1 wrapper can
be added later for a specific hot path that measures a need for it. This trades a small, cheap Redis
round-trip today for coherence and simplicity.

### 3. Hard dependency on `@nebula-chat/otel` — all logging and metrics through it

The lib depends on `@nebula-chat/otel` and takes an injected `Logger`; it emits cache hit/miss as
OpenTelemetry metrics. No `console.*`, no app-logger import. This couples one lib to another, which we accept:
`@nebula-chat/otel` is the foundational observability substrate (M-5), a shared lib must not invent its own
logging, and the alternative — a bespoke stats blob and HTTP admin endpoints, which the old module had — is
exactly the bloat this redesign removes. Observability belongs in the observability lib.

### 4. Redesign over lift — discard the old module rather than move it into `libs/`

The old module is dropped, not migrated. Its stats blob, FIFO keys-list, and HTTP admin endpoints go; only
its **fail-open** behavior is kept (Redis errors degrade to a cache miss/no-op, never breaking chat).
Eviction moves from the hand-rolled capped list to **per-key TTL + Redis `maxmemory-policy`
(`allkeys-lru`)**. The M-9 test suite is the regression net that makes discarding safe.

## Consequences

- One way the app talks to Redis; future tickets extend a toolkit instead of opening new clients.
- `ioredis` replaces node-`redis`; the connection layer and `redis`-specific calls are rewritten.
- The cache **key is intentionally unchanged** for now (`conversationId + model + hash(last user message)`),
  so CONTEXT.md's "Cache entry" term still holds and no domain vocabulary changes. The key is known-imperfect;
  correcting it (full-context hash, dropping `conversationId`, semantic caching) is a **separate future
  ticket**.
- **Regenerate** now bypasses + overwrites the cache — a behavioral change shipped with this ticket.
- Losing the HTTP stats endpoints means cache observability is OTel-only until an admin dashboard exists.
- **Ops dependency:** relying on `maxmemory-policy` assumes the managed Redis permits setting it; if not, the
  fallback is an atomic sorted-set + Lua trim inside the primitive.

## Alternatives considered

- **Keep node-`redis` and run a second `ioredis` client for BullMQ.** Rejected: two connection pools and
  lifecycles defeats the shared-connection design.
- **`@nebula-chat/cache` doing only caching.** Rejected: forces M-7/M-8 to open their own Redis clients.
- **A "framework for everything Redis can do."** Rejected as speculative — a lib that wraps all of Redis
  abstracts none of it; primitives are added when a consumer needs them.
- **Lift the existing module into `libs/` unchanged.** Rejected: it would carry the stats/FIFO/admin bloat the
  redesign exists to remove.
