# ADR-0013: A dedicated worker app owns all LLM execution; the server holds no LLM keys

- **Status:** Proposed — to be implemented by the nebula-chat 2.0 epic (NEB-349)
- **Date:** 2026-09-22
- **Deciders:** @itsDaiton

## Context

nebula-chat 2.0 adds orchestrated **Runs**: one user Message fans out to several Agents on different models, with tool calls, running for up to minutes and surviving a page refresh. That work cannot live inside an HTTP request, and it should not share a process with the API that serves auth and reads.

Today every LLM call happens inside the server: `apps/nebula-chat-server/src/modules/chat` calls `streamChat` from `@nebula-chat/langchain` (ADR-0005) inside a hijacked SSE response. `@nebula-chat/langchain` is a library, but its only consumer is the server, and it mixes LLM concerns (providers, registry, token math, the chat chain) with transport concerns (SSE string formatters).

A `/grill-with-docs` session settled the boundary. The project is a learning vehicle for distributed-systems patterns, so the design favors a real process boundary over the cheapest deployment.

## Decision

Introduce **`apps/nebula-chat-worker`**, a separately built and deployed app that owns **all** LLM execution — Direct replies as well as Runs. The server becomes API, auth, persistence of user input, and an SSE relay.

1. **All LLM work moves, including Direct replies.** The server holds no LLM API keys and never imports provider SDKs. Direct replies are a lightweight job type; Runs are a heavier one. One delivery path serves both.
2. **`@nebula-chat/langchain` is dissolved into the worker.** Providers, `MODEL_REGISTRY`, token counting, `packHistory`, streaming, tool calling, Agents and the response cache all live in the worker app. A library with one consumer is indirection; it can be re-extracted if a second consumer appears. SSE formatting moves to the server, the only place that speaks SSE.
3. **A new `@nebula-chat/contracts` lib is the only code the two apps share.** It holds Zod schemas for job payloads and stream events. The server and worker deploy independently, so this contract is the system's most important seam and is versioned strictly. The worker never imports server code, and vice versa.
4. **The server talks to the worker only through BullMQ (jobs) and Redis (streams, cancel flags)**, plus a `/health` ping. Durable state lives in Postgres, which both apps reach through `@nebula-chat/db`.
5. **Hosting: a second free Render web service.** Render's free plan has no background workers, so the worker runs as a web service exposing `/health`. Free web services sleep without inbound HTTP traffic, so the server pings the worker's `/health` when it enqueues a job, and the enqueue wakes the worker. Cold starts after idle periods are accepted.

## Consequences

- **Chat hard-depends on the worker.** If the worker is down or asleep, no reply of any kind is produced — the server still accepts the Message and the job waits in the queue.
- Every Direct reply pays an extra hop (server → Redis → worker → Redis → server). That costs milliseconds, except after idle periods, when the worker's cold start applies.
- The in-process `llmConcurrencyLimiter` becomes a per-worker-instance limit, and BullMQ worker concurrency becomes the primary throttle.
- `lib:langchain` is retired; `lib:contracts` is created following the new-lib checklist in `AGENTS.md`.
- The server's response-cache hooks are deleted; caching of Direct replies happens in the worker through `@nebula-chat/redis`'s `cache` primitive.

## Alternatives considered

- **Keep Direct replies in the server; move only Runs.** Rejected: two LLM call paths, two places holding keys and concurrency limits, and the worker would only be exercised by the rarer, harder path.
- **Make a Direct reply a degenerate Run.** Rejected: Runs are Registered-only and carry inspectable Steps; forcing Guest replies through that concept distorts it.
- **Keep an LLM library (renamed `@nebula-chat/llm`) consumed only by the worker.** Rejected: one consumer does not justify a library boundary.
- **Paid Render background worker.** Rejected on cost; it is a config change if that changes.
- **Run the worker inside the server process in production.** Rejected: it keeps the code boundary but makes production non-distributed, which defeats the project's learning goal.
