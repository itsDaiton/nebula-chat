# ADR-0016: One BullMQ job per Run; durability comes from persisted Steps, not from the queue

- **Status:** Proposed — to be implemented by the nebula-chat 2.0 epic (NEB-349)
- **Date:** 2026-09-22
- **Deciders:** @itsDaiton

## Context

A Run executes many Steps, some of them in parallel (ADR-0015). BullMQ can model this in two ways: one job for the whole Run, or one job per Step with `FlowProducer` parent/child jobs. Runs must survive a worker crash or redeploy, and workers must be idempotent and retry-safe. Large data must not live in job payloads.

## Decision

1. **One job per Run** (and one per Direct reply). The payload carries only IDs and the OTel `traceparent`, so one trace spans server → queue → worker → every Step. The whole Run — Intake, the Orchestrator loop, Output — executes inside that job. Parallel tool calls within a turn run as concurrent promises under a per-turn cap.
2. **Every Step is written to Postgres as it completes**, with its full input, output, tokens, status, error and timings. Postgres gains `runs` and `steps` tables, and assistant Messages gain a link to their Run.
3. **Resume by replay.** When BullMQ retries a Run job after a crash, the worker loads the Run's completed Steps and **replays their recorded results instead of re-executing them**, continuing from the first incomplete Step. That makes a retry idempotent with respect to LLM calls and tool side effects already completed.
4. **Failure policy.** Only failures the user cannot do without fail the Run: the Orchestrator, the Output Agent, or infrastructure, once job retries are exhausted. Delegate and Intake failures degrade the Run, and limits force a handoff. End states are `completed`, `partial`, `failed` and `cancelled`.

## Consequences

- BullMQ provides retries, concurrency, scheduling and crash recovery, while the application owns orchestration semantics. This keeps the 2.0 design's rule that BullMQ executes work but never decides it.
- A single Run cannot spread its Steps across several worker instances. That is acceptable while one worker instance runs.
- Step records do triple duty: resume, the Run inspection view, and per-user token accounting (the planned direction for any future daily allowance).
- Full Step payloads are stored. Storage cost is negligible at this scale, and inspection is a goal.

## Alternatives considered

- **One job per Step with `FlowProducer`.** Deferred rather than rejected. It distributes Steps across instances but turns every Orchestrator turn into a suspend-and-resume across jobs. The persisted Step records make that migration straightforward if multiple worker instances ever justify it.
- **Rely on job retries alone, re-running the whole Run.** Rejected: repeats every LLM call and tool side effect, and is not idempotent.
- **Carry intermediate results in the job payload or job return values.** Rejected: large data does not belong in the queue, and Postgres is already the durable record.
