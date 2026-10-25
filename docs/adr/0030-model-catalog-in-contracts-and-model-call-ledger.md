# ADR-0030: A static model catalog in `@nebula-chat/contracts`, and an append-only Model call ledger priced when each call is recorded

- **Status:** Proposed — the catalog landed with NEB-565; the Model call ledger is still to come
- **Date:** 2026-10-18
- **Deciders:** @itsDaiton
- **Related:** [ADR-0013](./0013-worker-app-owns-all-llm-execution.md) — amended: `contracts` now also holds shared static data; [ADR-0015](./0015-run-model-intake-orchestrator-loop-output.md) — Runs and Steps

## Context

The admin dashboard shows prompts, tokens and estimated spend per Model, and the redesigned model
picker shows labels, provider logos and context sizes. Today the model registry lives in
`@nebula-chat/langchain` with no prices, and the client hardcodes its own model list. After
nebula-chat 2.0 the registry moves into the worker, which the server may not import (ADR-0013). Yet
the server validates a Session's Model, the worker executes and prices calls, and the client
displays the catalog. Usage is spread across Direct replies (one LLM call each) and Runs (one per
model-calling Step).

## Decision

1. **The model catalog is static data in `@nebula-chat/contracts`**: id, label, provider, context window, max output, and prices (input, cached input and output per million tokens). The server serves it as `GET /api/models`; the worker reads limits and prices from it; the client renders it. This widens ADR-0013's "contracts holds schemas only" to "schemas and the static data both apps need".
2. **Every LLM invocation is recorded as one Model call** in an append-only ledger written by the worker. It records the User, Session, Run, Step and Agent where present, the Model and provider, input, cached-input and output tokens, the estimated cost, the duration and the outcome. A replayed Cache entry is recorded at zero cost. Tool Steps record nothing.
3. **The cost is computed when the call is recorded and stored on the row**, so a later price change does not rewrite history.
4. **The ledger lands directly after NEB-354.** NEB-359 and NEB-360 write a Model call for every model-calling Step, so no Run goes unrecorded.
5. On Purge, a User's Model calls lose their identifying references but remain (ADR-0028).

## Alternatives considered

- **Derive usage from Messages and Steps.** There are two row shapes, Direct replies have no input/output token split, and cost would be computed at read time.
- **Price table editable in the dashboard.** Possible later; prices as code keep a reviewed history.
- **The worker publishes its catalog to Redis.** Couples server reads to the worker being up.
