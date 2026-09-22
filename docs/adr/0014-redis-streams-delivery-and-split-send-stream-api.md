# ADR-0014: Deliver replies through per-reply Redis Streams, with separate send and stream endpoints

- **Status:** Proposed — to be implemented by the nebula-chat 2.0 epic (NEB-349)
- **Date:** 2026-09-22
- **Deciders:** @itsDaiton

## Context

Today `POST /api/chat/stream` persists the user Message _and_ holds the SSE response open for the whole completion. Once the worker produces replies (ADR-0013), the tokens are generated in a different process from the one holding the client's connection. A Run can take minutes and must survive a refresh or a dropped connection, so the client needs to **reconnect and catch up**, not just receive a live feed.

## Decision

1. **Split send from stream.**
   - `POST /api/sessions/:id/messages` with `{ content, mode: "direct" | "run" }` persists the user Message, creates the Run when `mode` is `run`, enqueues the job, and returns **202** with `{ messageId, streamId }`.
   - `GET /api/streams/:streamId` is an SSE relay that honors `Last-Event-ID`.
   - `POST /api/streams/:streamId/cancel` requests cancellation.
   - `GET /api/runs/:runId` returns a Run and its Steps for inspection.
     Direct replies and Runs use the same endpoints; `mode` is the only difference.
2. **One Redis Stream per reply.** The worker appends every event — Step started/finished, Streaming tokens, usage, errors, end — to a stream keyed by `streamId`. The server tails it with a blocking read and writes each entry as an SSE event whose `id` is the stream entry ID. A reconnecting client sends `Last-Event-ID` and the server resumes reading from exactly that offset.
3. **Streams are transport, not storage.** A stream gets a TTL once its end event is written. Postgres remains the durable record (the Run, its Steps, the final Message); a client arriving after the TTL reads state from the API instead.
4. **Cancellation is a Redis flag** keyed by `streamId`, checked by the worker between turns and wired to an `AbortSignal` for in-flight model calls.
5. `@nebula-chat/redis` gains a **`streams` primitive** (append, read-from-offset, expire), the seam ADR-0009 anticipated.

## Consequences

- The client's streaming hook is rewritten: send, then subscribe, with reconnect by last event ID.
- The "Conversation" → **Session** rename (see `CONTEXT.md`) lands with this API cut, since the routes are being redrawn anyway.
- Error events on the stream carry the typed error envelope from ADR-0011.
- Stream memory is bounded by TTL plus Redis `maxmemory-policy`; a stream whose worker died mid-reply expires on its TTL, and the Run's durable status tells the client what happened.

## Alternatives considered

- **Redis pub/sub.** Rejected: fire-and-forget. Anything published while the client is disconnected is lost, so reconnection needs a snapshot fetch plus a subscribe, with a race between the two.
- **Keep one long `POST` that holds SSE open.** Rejected: a dropped connection loses the reply stream, and there is nothing to reconnect to.
- **Client polls a status endpoint.** Rejected: no token streaming, and it adds latency and load for no gain over a resumable stream.
