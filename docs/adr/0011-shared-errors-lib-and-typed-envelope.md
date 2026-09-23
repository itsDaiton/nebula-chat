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
- The server registers the envelope schema under the id `ErrorEnvelope`, so the OpenAPI document declares it once as a component and every error response references it. Orval therefore generates one shared `ErrorEnvelope` type instead of a separate type per route and status.
- The client takes on `zod` **through** `@nebula-chat/errors` (a dependency of the lib), not as a direct dependency of its own — the client never imports `zod` itself.
- Frontend call-site conversion is **out of scope here** — NEB-323 ships the lib, the backend emission (JSON + SSE), and the FE mapping primitives; the react-query/axios call-site adoption that consumes them is NEB-307 (see ADR-0012). This is why NEB-323 ships first.
