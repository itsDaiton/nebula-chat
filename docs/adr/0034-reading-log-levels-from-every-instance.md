# ADR-0034: Reading runtime log levels — every instance reports its own, over Redis request/response

- **Status:** Accepted
- **Date:** 2026-10-19
- **Deciders:** @itsDaiton
- **Related:** [ADR-0020](./0020-runtime-log-level-switching.md) — amended: the channel protocol gains report requests, and `LogLevelPubSub` gains `unsubscribe`; [ADR-0029](./0029-operator-cli-as-an-api-client.md) — `nebula log-level get` is its first read command

## Context

`nebula log-level set` (NEB-561) changes levels, but nothing reads them back. An Operator who set
`redis` to `debug` an hour ago cannot tell whether it still holds, when it expires, or who set it.

Levels live in each server instance's logger tree (ADR-0020 §3), not in one store. ADR-0020 already
names how instances drift apart: pub/sub is fire-and-forget, so an instance that restarts, or
reconnects to Redis, after a change never gets it. A `GET` answered by whichever instance the load
balancer picks shows only that instance.

## Decision

1. **`GET /api/internal/log-level` asks every instance.** It sits behind the same `requireOperator`
   gate and `Operator` tag as the `POST`, and answers
   `200 { receivers, reports: [{ instance, levels: [{ target, level, expiresAt, operator }] }] }`.
   `levels` lists the root, then every component, at the level that instance applies now: a runtime
   change carries its `expiresAt` and `operator`, and a boot-time level carries `null` for both.
2. **Request/response over pub/sub.** The answering instance subscribes to a fresh reply channel
   `log-level-reply:<service.name>:<uuid>`, then publishes `{ replyTo }` on
   `log-level-report:<service.name>`. Every instance subscribes to that channel at boot, next to
   `log-level:<service.name>`, and publishes its report to `replyTo`. A listener answers only on
   its own service's reply prefix, so a request cannot aim replies at another channel.
3. **`receivers` decides how long to wait.** `PUBLISH` returns how many instances received the
   request. The route waits for that many reports, or 2 seconds, whichever comes first, then
   unsubscribes the reply channel. Fewer reports than `receivers` means an instance did not answer.
4. **Each instance is named by `hostname:pid`.** On Render every instance has its own hostname. The
   pid keeps two local processes apart.
5. **Layering stays as ADR-0020 set it.** `@nebula-chat/otel` owns the protocol
   (`listenForLogLevelChanges` now also answers reports; `collectLogLevelReports` asks). The
   `LogLevelPubSub` port gains `unsubscribe`, and `@nebula-chat/redis`'s `pubsub` implements it:
   it drops the handler and sends `UNSUBSCRIBE` once a channel has none left.
6. **The CLI shows the drift.** `nebula log-level get` prints one row per instance and target. It
   warns on stderr when instances disagree on a target's level, or when some did not answer.

## Considered options

- **Report the answering instance only, labelled as such.** The smallest change, and complete on a
  single instance. Rejected: on several instances it hides the instance that missed a change, the
  exact failure ADR-0020 accepts. It is also the "HTTP only" shape ADR-0020 rejected for writes.
- **Persist active overrides and their expiry in Redis on publish, and read them back.** Rejected:
  it reports what was asked for, not what is applied. After a restart an instance is back at its
  boot level while Redis still says `debug`. Making boot re-apply persisted overrides would fix
  that, but it would change ADR-0020's "a restart drops it" behaviour, which is a separate decision.
- **One long-lived reply channel per instance, correlated by request id.** This needs no
  `unsubscribe`, but the requesting code then has to share state with the boot-time listener. A
  per-request channel keeps `collectLogLevelReports` self-contained.

## Consequences

- **Positive:** an Operator sees what every instance applies, including drift after a restart,
  with each change's expiry and who asked. The read changes nothing and writes no log line.
- **Negative / tradeoffs:**
  - A `GET` can take up to 2 seconds when an instance received the request but cannot answer.
  - Each `GET` costs a `SUBSCRIBE`, a `PUBLISH` per instance and an `UNSUBSCRIBE` on the
    subscriber connection the server already holds. This is negligible for an operator route.
  - An instance still on the previous build during a deploy does not subscribe to the report
    channel. It is not counted in `receivers`, so it is missing rather than reported as late.
  - Instance names are `hostname:pid`, not a stable id. A restarted instance shows under a new
    name.
- **Neutral:** the spec gains the route and the `LogLevelReports`, `LogLevelReport` and
  `LogLevelState` schemas (an `openapi` release). The CLI client gains `getLogLevels`, and the
  browser client is unchanged. No DB change.
