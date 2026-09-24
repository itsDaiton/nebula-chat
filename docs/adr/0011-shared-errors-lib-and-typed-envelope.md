# ADR-0011: Consolidate error handling into a shared `@nebula-chat/errors` lib with a typed error envelope across both apps

- **Status:** Accepted — implemented in NEB-323
- **Date:** 2026-09-22
- **Deciders:** @itsDaiton

## Context

Error handling drifted into three unrelated shapes:

- **Backend, JSON routes** — clean and centralized: an `AppError` hierarchy (`apps/nebula-chat-server/src/errors/AppError.ts`) plus one global `errorHandler` (`error.handler.ts`) that maps Zod validation, `AppError`, PostgreSQL codes, and an unknown-error fallback to `{ success: false, error, message }`.
- **Backend, chat streaming** — divergent: the SSE path calls `reply.hijack()`, so it never reaches the global handler. `chat.service` has its own `try/catch` that emits the **raw** `error.message` as an SSE `error` event via `libs/langchain`'s `sseError(message: string)` — no `AppError` classification, no typed shape, and it leaks internal messages to the client.
- **Frontend** — a third, parallel world: raw-`fetch` stores throw through `handleHttpError`/`handleNetworkError` (`shared/utils/errorHandler.ts` → `HttpError`), while `useChatStream` parses SSE `error` events into a store string on a completely separate code path.

The on-wire contract (`errorResponseSchema`) is a bare `{ success: false, error: string, message: string }` — the `error` field is an untyped string, and there is no room for structured, per-error data. The message-allowance rejection, for example, is a plain-string `ForbiddenError` even though the frontend would like `{ limit, count }` to render "X of Y used."

A `/grill-with-docs` session resolved this. We want **one error vocabulary shared by both apps**, carrying optional structured data, with real type-safety across the wire.

## Decision

Introduce **`@nebula-chat/errors` (`libs/errors`)** as the single, framework-agnostic (browser-safe, no Fastify/Node imports) source of truth for errors, consumed by both apps.

The lib owns:

- A **closed `ErrorCode` union** (`NotFound`, `BadRequest`, `Unauthorized`, `Forbidden`, `PayloadTooLarge`, `Conflict`, `Validation`, `Internal`, …) with an `Unknown`/`Internal` escape hatch for the open end.
- The wire **`ErrorEnvelope`**: `{ success: false, error: ErrorCode, message: string, details? }`, modelled as a **discriminated union on `error`** so `details` is typed per code.
- A **Zod schema** for the envelope (the lib depends on `zod`).
- The base error class **and** the plain, framework-free subclasses (`NotFoundError`, `ForbiddenError`, …), re-homed from the backend.
- Type guards (`isErrorEnvelope`, `isAppError`).

The backend keeps only its Fastify glue — `error.handler.ts` and the PG-code mapping — and `error.schema.ts` becomes a re-export of the lib's envelope schema so route `response:` blocks reference one schema. The frontend gains `zod` and consumes the lib's guards/parser.

Four sub-decisions clear the "hard to reverse + surprising + real trade-off" bar.

### 1. The taxonomy, envelope, and plain error classes live in the lib — not the backend

`AppError` and its subclasses are plain TypeScript classes with no Fastify dependency, so they move into the lib and both apps import them. Only the pieces that genuinely need `reply` (the handler) or Postgres knowledge (PG mapping) stay backend-side. This maximizes the consolidation that motivated the lib; a hand-mirrored frontend copy of the taxonomy would drift from the backend's.

### 2. `error` is a closed union; `details` is a per-code discriminated union

The whole point of _sharing_ the taxonomy is exhaustiveness — the frontend can `switch` on `error` and the compiler enforces coverage. A per-code discriminated `details` (rather than a loose `details?: Record<string, unknown>`) is what makes the envelope "modular/parametrizable" **with** type-safety end to end: `error: 'Forbidden'` narrows `details` to `{ limit, count }`; most codes carry no `details`. We seed exactly one structured case — the allowance error — and leave `details` absent elsewhere until a concrete need appears. The cost is a little more wiring to add a new structured code; that is the price of inference across the wire.

### 3. The lib ships the Zod schema; the frontend takes on `zod`

The backend already validates route responses with `fastify-type-provider-zod`, so shipping the envelope **as a Zod schema** lets route `response:` blocks import it directly, and lets the frontend parse/validate axios error bodies against the same schema. The alternative — the lib exports plain types and each app re-declares its own schema — reintroduces exactly the drift the lib exists to remove. The cost is a new `zod` dependency in the client bundle; `zod` is small and tree-shakeable, and it unlocks turning on Orval's zod output later.

### 4. One envelope over both transports — JSON and SSE

`libs/langchain`'s `sseError` is generalized to emit the **same envelope** as the JSON path (`libs/langchain` takes a dependency on `@nebula-chat/errors`). `chat.service`'s catch classifies the error: an `AppError` emits its own `code`/`message`/`details`; anything else emits `Internal` plus a generic message, ending the practice of leaking raw `error.message` to clients. A hijacked SSE reply has no HTTP status, so the envelope's machine-readable field is `error` (the code), not a status number. The frontend's SSE handler in `useChatStream` is updated **within this ticket** to parse the new envelope, so the one FE SSE consumer keeps working end to end.

## Consequences

- Enriching the envelope changes the OpenAPI contract, so NEB-323 ends with `pnpm --filter nebula-chat-server run generate:openapi` + an Orval client regen. The envelope stays **generic per route** (no per-endpoint error-code unions) to avoid over-engineering.
- `libs/errors` follows the new-lib checklist in order: `.gitignore` (`dist/`, `node_modules/`) → register in `release-please-config.json` → `gh label create lib:errors` → implement → commit/push. It is small enough not to warrant its own `AGENTS.md`.
- Frontend call-site conversion is **out of scope here** — NEB-323 ships the lib, the backend emission (JSON + SSE), and the FE mapping primitives; the react-query/axios call-site adoption that consumes them is NEB-307 (see ADR-0012). This is why NEB-323 ships first.

## Amendments made while implementing NEB-323

Implementing the decision above changed some of its details. These amendments supersede the text above where the two disagree.

1. **The allowance has its own code, `MessageAllowanceReached` (403), with required `details`.** Decision 2 put `{ limit, count }` on `Forbidden`. But `ForbiddenError` is also thrown for plain refusals ("requires a registered account"), so there `details` could only be optional, and narrowing on `Forbidden` would guarantee nothing. A dedicated code keeps decision 2's promise: narrowing on the code guarantees the details. `Forbidden` carries no details.
2. **`Internal` never shows its own message.** Decision 4 had every `AppError` emit its own message. An `AppError` classified as `Internal` (for example `MissingConfigurationError`, "OPENAI_API_KEY is not configured") is a server-side fault, so its message stays in the logs and the client gets `GENERIC_ERROR_MESSAGE`, as for any unclassified error.
3. **One code table decides the status.** `ERROR_STATUS` maps each code to its HTTP status, and an `AppError` takes its status from its code, so the two cannot disagree. The old free-string codes were renamed to fit the closed union: `ValidationError` → `Validation`, `ConflictError` → `Conflict`, and `InternalServerError` / `MissingConfiguration` → `Internal`. HTTP statuses are unchanged. `TooManyRequests` (429) was added for both rate limiters. `APIError`, `ClientInitializationError`, `RedisConnectionError` and `RedisCacheError` had no callers and were not carried over.
4. **Routes import the lib schema directly.** `error.schema.ts` was going to be a re-export. Instead it was deleted, and routes use `errorEnvelopeSchema` from `@nebula-chat/errors`, so the concept has one name.
5. **The envelope is a named OpenAPI component.** The lib gives the envelope and its parts metadata ids (`ErrorEnvelope`, `GeneralErrorCode`, `MessageAllowanceDetails`). The OpenAPI document declares each once, and every error response references `ErrorEnvelope`, so Orval generates one small set of shared types instead of a separate type per route and status. The server prunes the unreferenced `…Input` twins that `fastify-type-provider-zod` emits for every registered schema.
6. **The client takes on `zod` through `@nebula-chat/errors`** (a dependency of the lib), not as a direct dependency of its own. The client never imports `zod` itself.
