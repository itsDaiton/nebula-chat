# ADR-0039: Admins change log levels from the dashboard, and a revert is a one-second change

- **Status:** Accepted
- **Date:** 2026-11-27
- **Deciders:** @itsDaiton
- **Related:** [ADR-0020](./0020-runtime-log-level-switching.md) (runtime level switching),
  [ADR-0034](./0034-reading-log-levels-from-every-instance.md) (reading levels from every instance),
  [ADR-0036](./0036-every-route-declares-its-access-level.md) (one Access level per route)

## Context

Only the Operator could change log levels at runtime, through `/api/internal/log-level` and the CLI. An Admin
with two-factor should be able to do it from the dashboard's Operations page (#902). ADR-0036 gives every route
exactly one Access level, so the Operator routes cannot also admit an Admin. The dashboard also needs a Revert,
but the pub/sub protocol has no revert message, and an instance's report does not say what its boot-time level is.

## Decision

1. **Separate admin routes.** `GET` and `POST /api/admin/log-levels` sit at the `admin` Access level and call the
   same `logLevel` service. The Operator routes and the CLI are unchanged.
2. **The operator is the acting Admin.** The services log the Admin's account name as `nebula.operator`, or
   their id when the name is blank, since the listeners drop a blank operator. A body `operator` is dropped.
3. **Audited before it is sent.** Each change writes a `log_level.changed` Audit entry (service, target, level,
   `ttlSeconds`) and only then publishes, so a failed Audit write changes nothing.
4. **A revert is a one-second change.** `{"revert":true}` reads the instances' reports, takes the level the
   target holds temporarily (`409` when none does) and re-sends it with `ttlSeconds: 1`. Each instance's own
   timer then restores its boot-time level and logs `log.level.reverted`. It is audited like any change.

## Considered Options

- **A revert message in the pub/sub protocol:** each instance would drop its runtime level at once. Rejected for
  now: it changes `@nebula-chat/otel`'s listener on every server and worker, and the one-second change gets the
  same end state with no protocol change.
- **Opening the Operator routes to Admins:** rejected by ADR-0036; a route has one Access level.
- **The client sends the boot-time level:** impossible, since reports carry only the current level.

## Consequences

- When instances disagree, a revert sends every instance the level it found first for one second.
- A revert waits up to the 2-second report window (ADR-0034) before it is sent, and a change made in that window
  can be overwritten.
- The Audit log records a revert as `{ level, ttlSeconds: 1 }`: it reads as a one-second change, not a revert.
- An Admin's account name is now logged; `server-logging.md` and `docs/logging.md` name this as the one exception
  to never logging names.
