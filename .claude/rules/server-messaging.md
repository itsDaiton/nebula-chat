---
paths:
  - 'apps/server/src/modules/chat/**'
  - 'apps/server/src/modules/stream/**'
  - 'libs/contracts/**'
---

# Sending a Message and streaming its reply

The server does no LLM work and holds no LLM keys (ADR-0013): it persists the user's Message, enqueues the
reply for the worker, and relays the reply stream (ADR-0014). The full sequence is in
[docs/architecture.md](../../docs/architecture.md#direct-reply). Specifics worth knowing:

- `POST /api/sessions/:sessionId/messages` answers `202 { messageId, streamId }`. Its chain is rate limit
  (10/60 s per IP) → body validation → `requireAuthentication` → `chat.messageAllowance.hook`
  (403 `MessageAllowanceReached` before anything is persisted) → `chatService.sendMessage`.
- `sendMessage` holds the Message to **2 000** prompt tokens (413), persists it in a transaction, records the
  stream owner in Redis, enqueues IDs only (checked against `@nebula-chat/contracts`), and pings the worker's
  `/health` unawaited. Limits and prices are in the model catalog in `@nebula-chat/contracts` (ADR-0030).
- The catalog is served as `GET /api/models` (public, cached for an hour) with its `version` and `hash`, and `modelIdSchema` derives from it,
  so a Session can only be bound to a Model in the catalog (400 `Validation` otherwise).
- `GET /api/streams/:streamId` checks the owner (another User's stream is a 404), hijacks the reply and
  relays the stream as SSE with `id` = the entry id, a `: keep-alive` comment per idle 15 s, ending after `end`.
- `GET /api/chat/message-allowance` is a plain read that shares `getMessageAllowance` with the hook
  ([docs/auth.md](../../docs/auth.md#reading-the-allowance)).
- A Message sent to a Session with a `waiting` Run is that Run's answer, whatever its `mode`: `claimWaitingTx` moves
  the Run to `queued` in the same transaction that saves the Message (linked by `runId`), so it and the worker's
  timeout job settle it once. The timeout job is removed and a resume job enqueued. Cancelling the last stream of
  a waiting Run (or Archive, Ban) raises the Run's cancel flag and promotes its timeout job.
- SSE events are `ReplyStreamEvent` in `@nebula-chat/contracts`: `token`, `usage`, `error` (the error
  envelope), the Run events (`step-started`, `step-finished`, `run-finished`, and `run-waiting` when a Run
  pauses on a Clarifying question, after which the stream ends), and `end` (always last). An entry the server cannot parse is skipped, so the contract can grow.
