# ADR-0031: The worker app runs all background jobs, not only LLM execution

- **Status:** Accepted — first used by the Purge job (NEB-545)
- **Date:** 2026-10-18
- **Deciders:** @itsDaiton
- **Related:** [ADR-0013](./0013-worker-app-owns-all-llm-execution.md) — amended; [ADR-0028](./0028-account-deletion-pending-deletion-and-purge.md) — the Purge

## Context

ADR-0013 introduced the worker to own all LLM execution. The first non-LLM background work has appeared: a daily Purge of Users whose Pending deletion has expired and of inactive Guests. The server has no scheduler, and running a sweep in a horizontally scaled API process needs locking. Render cron jobs are a separate paid service.

## Decision

The worker owns **all background work**: LLM jobs and scheduled jobs alike. Scheduled jobs are **BullMQ repeatable jobs**, so exactly one run happens per schedule however many worker instances are up. The server never runs timers or sweeps.

## Consequences

- Anything that would block on the worker also blocks scheduled jobs. For the Purge that is acceptable: its 30-day window gives days of slack.
- The ADR-0013 boundary still holds: the server and the worker share only `@nebula-chat/contracts` and `@nebula-chat/db`.

## Alternatives considered

- **A daily sweep in the server behind a Redis lock.** No dependency on the worker, but it puts scheduled work in the API process.
- **A Render cron job.** A separate paid service for one query a day.
