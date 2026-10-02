# ADR-0020: Runtime log-level switching — an operator-token route, broadcast over Redis pub/sub, reverting on expiry

- **Status:** Accepted — implemented by NEB-370 (#370)
- **Date:** 2026-10-02
- **Deciders:** @itsDaiton
- **Related:** [ADR-0017](./0017-structured-logging-conventions.md) — deferred this as "Runtime level switching"; [ADR-0009](./0009-nebula-chat-redis-lib.md) — `pubsub` was one of its designed-for seams

## Context

Log levels come from `LOG_LEVEL` and `LOG_LEVEL_OVERRIDES`, read once at boot. On Render, changing either is a redeploy. The restart often makes the problem you wanted `debug` lines for go away, and once the v2 worker exists (ADR-0013) it also interrupts in-flight Runs.

ADR-0017 deferred runtime switching because it raises questions of its own:

- **Authorization.** There is no admin role. Guests and Registered users are the only kinds of User, and neither may change log levels.
- **Several processes.** The server (and later the worker) may run several instances. A change made on one has to reach the others.
- **Mechanism.** Render cannot signal a service, so the change has to come through the network.
- **Cost.** A forgotten `trace` in production burns free-tier log volume.

## Decision

1. **An operator route, gated by a shared secret.** `POST /api/internal/log-level` takes `{ component?, level, ttlSeconds, operator }`. Only `Authorization: Bearer <OPERATOR_TOKEN>` gets through, compared in constant time over SHA-256 digests. A User's session counts for nothing, so a Guest or a Registered user gets `403 Forbidden`. The gate runs in `onRequest`, before body validation, so a caller without the token learns nothing of the schema. With `OPERATOR_TOKEN` unset the route answers `404`. It is hidden from the OpenAPI spec, so no generated client hook exists for it. `operator` is a name the caller states, not an identity: everyone holding the token is equally trusted.
2. **Broadcast over Redis pub/sub, one channel per service.** The route publishes the change on `log-level:<service.name>` and answers `202 { receivers, expiresAt }`. Every instance subscribes at boot and applies what arrives, the instance that took the request included. `receivers` is Redis's count of subscribers on that channel, so it counts the targeted service's instances and `0` means none was listening.
3. **Each instance applies and records the change itself.** `changeLogLevel` in `@nebula-chat/otel` sets the root level, or one component's, on the live logger tree. Every instance writes `log.level.changed` (`nebula.log.target`, `nebula.log.level.from`/`.to`, `nebula.log.level.expires_at`, `nebula.operator`), and on expiry `log.level.reverted`. Both are written at `info` by a child with its own fixed level, so a switch to `error` is still recorded.
4. **Every change expires.** `ttlSeconds` defaults to 15 minutes and is capped at 4 hours (`MAX_LOG_LEVEL_TTL_SECONDS`). On expiry the boot-time level returns. The root and each component carry their own timer. A second change to the same target replaces the first and restarts its timer. There is no early reset: send the boot level with a short TTL.
5. **The lib tracks the children it makes.** A Pino child created with its own level never follows its parent again, and Pino cannot unset that level. `componentLogger` therefore registers every child it creates, and each change re-applies to all of them: the component's runtime or boot override, else the parent's level. Component children are mostly per request, so the registry holds them through `WeakRef`, and a `FinalizationRegistry` drops collected ones.
6. **Layering.** `@nebula-chat/otel` owns the protocol: the in-process change, the message format, the channel name, and `publishLogLevelChange` / `listenForLogLevelChanges`. These run over a structural `LogLevelPubSub` port, so otel takes no Redis dependency. `@nebula-chat/redis` gains a generic `pubsub` primitive that fits the port, over a dedicated subscriber connection opened on the first `subscribe`. The worker (NEB-354) joins with one `listenForLogLevelChanges` call; the route gains a `service` selector then.

## Considered options

- **HTTP route only, applied in-process.** Rejected: with several instances, a request changes only the one the load balancer picked.
- **Redis channel only (`redis-cli PUBLISH`).** Rejected: authorization becomes "has Redis credentials", and nothing validates or records the request before it fans out.
- **An allowlist of Registered user ids.** Gives a real `user.id` for "who", but calling the route then needs a browser session cookie, which is awkward from a terminal at 2 a.m.
- **A new admin role (better-auth admin plugin).** Rejected for now: a schema migration and a role model for one endpoint. Revisit when a second operator feature appears.
- **A strong registry of component children.** Rejected: most are created per request, so it would grow without bound.
- **No registry; changes reach only loggers created afterwards.** Rejected: the long-lived component loggers (the Redis cache's, better-auth's) would never see a change, and `redis` is the component most worth turning up.

## Consequences

- **Positive:** a level change needs no redeploy and reaches every instance; it cannot be forgotten; every change and revert is on the record with who asked.
- **Negative / tradeoffs:**
  - Pub/sub is fire-and-forget. An instance that starts, or reconnects to Redis, after a change was sent never gets it, and a restart drops it. `receivers` makes a short count visible.
  - An instance that boots while Redis is down waits to subscribe (its subscriber connection retries without limit) rather than giving up, and misses changes until Redis is back.
  - A root change reaches requests from the next one on: Fastify fixes a request logger's level when the request starts. A component change reaches in-flight requests at once.
  - Each `componentLogger` call now allocates a `WeakRef` and a finalization record, and every change walks the live children.
  - `OPERATOR_TOKEN` is shared, so "who" is self-declared. Rotating it means changing one env var, which is itself a redeploy.
  - One more Redis connection per process, opened only by processes that listen.
- **Neutral:** no OpenAPI or DB change. `OTEL_LOG_LEVEL` stays boot-only.
