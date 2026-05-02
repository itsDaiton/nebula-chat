# ADR-0005: Extract LLM concerns into `@nebula-chat/langchain` workspace library

- **Status:** Proposed
- **Date:** 2026-05-02
- **Deciders:** @itsDaiton

## Context

Today the chat module in `apps/nebula-chat-server` is welded directly to a single LLM vendor. `src/modules/chat/` imports the `openai` SDK (v6.32.0) at call sites, counts tokens inline against `cl100k_base`/model-specific encodings in `chat.tokenizer.ts`, hand-formats SSE frames in `chat.utils.ts`, and threads provider-specific request shapes through the service and controller. The chat module owns four distinct responsibilities at once: HTTP wiring, conversation persistence, prompt/history orchestration, and provider transport. This bloat has three concrete consequences:

1. **Provider lock-in.** Swapping OpenAI for Anthropic (or any future provider) is not a configuration change — it requires rewriting the service. Every call site that imports from `'openai'` is a coupling point.
2. **No reuse path.** TICKET-M7 (job queues) and TICKET-M10 (resilience / circuit breaker) both need to invoke the LLM from contexts that are not the HTTP request lifecycle. They cannot import a chat _module_ — they need a self-contained library that exposes the LLM as a primitive. `docs/new-backend/TICKET-M7-queues.md` and `docs/new-backend/TICKET-M10-resilience.md` explicitly list this lib as a prerequisite.
3. **Missing ecosystem.** Token counting, context-window packing, prompt templates, retry policies, observability via LangSmith, structured output parsing — these are all solved problems in the LangChain ecosystem. Re-implementing them piecemeal inside the chat module duplicates work and produces a less observable system.

The monorepo already has the precedent set by ADR-0004 (`@nebula-chat/db`): standalone, versioned, dual-format workspace libraries consumed by apps via `workspace:*`. The same shape fits LLM concerns: a single owner of provider clients, token math, SSE formatting, rate limiting, and the model registry — exported through a stable surface. TICKET-M3 (`docs/new-backend/TICKET-M3-langchain.md`) defines the target package layout.

## Decision

Create `libs/langchain/` as a new workspace package published as `@nebula-chat/langchain`, and refactor `apps/nebula-chat-server/src/modules/chat/` to consume it. The package is the single home for everything LLM-shaped:

- **`createLLM(config)`** — multi-provider factory returning LangChain's `BaseChatModel`, supporting `openai` and `anthropic` (extensible). Caller code never imports a provider SDK.
- **`streamChat(config, callbacks)`** — the single orchestration entry point used by the backend's SSE route. It packs history, builds the LangChain chain, applies the global p-limit concurrency guard, iterates the LangChain stream, accumulates tokens, computes input/output usage, and invokes the supplied lifecycle callbacks. The callback contract is the lib's public streaming API; the controller's job becomes "wire reply.raw.write to those callbacks".
- **Pure SSE string formatters** — `sseToken`, `sseUsage`, `sseEnd`, etc. — exported as side-effect-free helpers so the controller can format frames without depending on Fastify or any HTTP transport from inside the lib.
- **`countTokens(text, model?)` and `packHistory(messages, limits)`** — tiktoken-backed (`cl100k_base` fallback for unknown models). Replaces `chat.tokenizer.ts` outright.
- **`createRateLimiter(options)`** — userId-keyed in-memory sliding-window limiter. Defaults to `'anonymous'` until M-6 (auth) lands so the JWT subject can be passed through with no interface change.
- **`LLMLogger` interface** — duck-typed Pino shape (`info`/`warn`/`error`/`debug` taking `(obj, msg?)`). The lib does not depend on Pino; the server passes its own logger in.
- **`MODEL_REGISTRY`** — the single source of truth for valid model names and context-window sizes. The server reads it for env validation and `packHistory` budget computation.
- **LangSmith tracing via env vars** — `LANGCHAIN_TRACING_V2`, `LANGCHAIN_API_KEY`, `LANGCHAIN_PROJECT`. No code changes; presence of the vars activates tracing on every chain invocation.

`apps/nebula-chat-server` is updated in lockstep: remove the `openai` package, add `@nebula-chat/langchain: workspace:*`, rename `OPENAI_API_KEY` → `LLM_API_KEY`, add `LLM_PROVIDER` and `LLM_MODEL` env vars (validated by `src/env.ts` against `MODEL_REGISTRY`). The chat module shrinks to DB operations (conversation/message persistence) and HTTP wiring (route, schema, SSE plumbing). All LLM logic moves into the lib.

The lib uses **`tsup` for build output (dual ESM+CJS)** rather than plain `tsc`. The transitive dependency `p-limit ^6.0.0` is pure ESM and cannot be re-emitted into CJS by `tsc`; tsup handles the bundling so the CommonJS server can still `require('@nebula-chat/langchain')`. This matches the pattern already established by `libs/db` (see ADR-0004) and is a deliberate deviation from the `"build": "tsc"` snippet in TICKET-M3.

## Alternatives Considered

- **Keep the bare `openai` SDK and extract into a shared service inside the server.** Rejected — solves the file-organization problem but not the architectural one. The service is still provider-coupled (every call site imports from `'openai'`), the ecosystem benefits (LangChain chains, prompts, LangSmith) are still absent, and M-7 / M-10 still cannot consume the LLM as a library because it lives inside `apps/nebula-chat-server`. This is half a fix.
- **Use LangChain directly inside the server with no library wrapper.** Rejected — gains the ecosystem but loses the workspace boundary. Future consumers (queue workers, circuit breaker wrapper, potential edge functions) would need to either depend on the server package or duplicate the wiring. The whole point of the `libs/` tier (established in ADR-0004) is to give shared infrastructure a stable, versioned home; LLM access belongs there for the same reasons DB access does.
- **Use `@ai-sdk/openai` (Vercel AI SDK) instead of LangChain.** Rejected — the AI SDK has a clean streaming API but a much smaller ecosystem. It does not ship LangChain's chain composition, prompt templates, output parsers, or LangSmith tracing integration. Re-implementing observability and chain orchestration on top of `@ai-sdk` would defeat the reason to adopt a higher-level abstraction at all. LangChain is the broader ecosystem play and the one TICKET-M3 commits to.
- **Plain `tsc` build for the lib (matching the snippet in TICKET-M3).** Rejected for the build-tool slice only — `p-limit ^6.0.0` is pure ESM and `tsc` cannot bundle it into the CJS output the server requires. tsup is already in the monorepo via `libs/db`, so the cost of using it here is zero and the consistency benefit is real.

## Consequences

- **Positive:**
  - The chat module in `apps/nebula-chat-server` becomes thin: HTTP route + Zod schema + DB persistence + SSE wiring. Provider transport, token math, history packing, rate limiting, and SSE formatting all leave the app and live in one library.
  - Switching providers becomes a one-env-var change (`LLM_PROVIDER=anthropic`, `LLM_MODEL=claude-3-5-sonnet-20241022`, `LLM_API_KEY=...`). No code edits, no redeploy of the chat module, no re-test of the route.
  - M-7 (queues) and M-10 (resilience) can both consume `@nebula-chat/langchain` directly via `workspace:*`, with no dependency on `apps/nebula-chat-server` and no duplicated provider wiring.
  - LangSmith tracing is opt-in via environment alone — three env vars and every chain invocation in every consumer is traced, with no per-call instrumentation code.
  - `MODEL_REGISTRY` becomes the authoritative model list. `src/env.ts` can validate `LLM_MODEL` against it at startup, so an unsupported model fails the boot, not the first request.
  - `LLMLogger` interface is duck-typed against Pino — the lib stays Pino-free, so future consumers using a different logger (or no logger) are not forced to install Pino transitively.
  - Pure SSE formatters (`sseToken`, `sseUsage`, `sseEnd`) are unit-testable in isolation with no Fastify, no HTTP, no streams.
- **Negative / Tradeoffs:**
  - One additional layer of indirection between the controller and the LLM. Reading a streaming chat request now traces through `controller → streamChat → buildChatChain → createLLM → ChatOpenAI/ChatAnthropic` instead of `controller → openai.chat.completions.create`.
  - `streamChat` becomes a public contract. Its callback shape (`onToken`, `onUsage`, `onEnd`, `onError`) must remain stable across future provider additions; breaking it cascades into every consumer (server today, M-7 workers and M-10 wrapper later). Adding a third provider with a fundamentally different stream shape (e.g. tool-calling deltas) requires extending the contract additively rather than reshaping it.
  - LangChain's bundle is non-trivial. Install size and cold-start time on the server will grow vs. the bare `openai` SDK. Acceptable given the ecosystem and observability gains, but worth measuring on Render after deploy.
- **Neutral:**
  - HTTP API surface is unchanged. `POST /api/chat/stream` keeps the same request body schema, same SSE event names, and the same Orval-generated frontend client. The OpenAPI spec regenerates identically.
  - Database schema is unchanged — persistence still writes the same `messages` rows.
  - The Redis response cache (see `src/modules/cache/`) is unaffected; cache hits short-circuit before `streamChat` is invoked.

## Implementation Notes

- **Files added (in `libs/langchain/`):**
  - `src/providers/types.ts` — `ProviderType`, `LLMConfig`, `ModelEntry`, `MODEL_REGISTRY`, `DEFAULT_MODELS`.
  - `src/providers/openai.ts`, `src/providers/anthropic.ts` — provider-specific `ChatOpenAI` / `ChatAnthropic` wiring.
  - `src/providers/factory.ts` — `createLLM(config): BaseChatModel` switch.
  - `src/tokens/counter.ts` — `countTokens(text, model?)` (tiktoken with `cl100k_base` fallback).
  - `src/tokens/window.ts` — `packHistory(history, limits)` (longest-suffix-fits algorithm, walks history backwards).
  - `src/rate-limit/concurrency.ts` — `llmConcurrencyLimiter` (process-wide p-limit cap of 10).
  - `src/rate-limit/sliding-window.ts` — `createRateLimiter(options)` with userId keying.
  - `src/chains/chat.chain.ts` — `buildChatChain(config)` (prompt + LLM + StringOutputParser).
  - `src/streaming/stream-chat.ts` — `streamChat(config, callbacks)` orchestration entry point.
  - `src/streaming/sse.ts` — pure `sseToken`, `sseUsage`, `sseEnd`, `sseError` string formatters.
  - `src/logging/logger.ts` — `LLMLogger` interface (duck-typed Pino shape).
  - `src/prompts/system.ts` — `SYSTEM_PROMPTS` map and `SystemPromptKey` type.
  - `src/index.ts` — public surface (re-exports of all of the above; no barrels nested deeper).
  - `package.json` — `@nebula-chat/langchain@0.1.0`, runtime deps `langchain`, `@langchain/core`, `@langchain/openai`, `@langchain/anthropic`, `langsmith`, `tiktoken`, `p-limit`; dev deps `tsup`, `typescript`, `@types/node`. `publishConfig.registry: https://npm.pkg.github.com` matching `@nebula-chat/db`.
  - `tsup.config.ts` — dual ESM+CJS output (`dist/index.js` CJS, `dist/index.mjs` ESM, `dist/index.d.ts`).
  - `tsconfig.json` — strict, ESNext target, matching the workspace style.
- **Files modified (in `apps/nebula-chat-server/`):**
  - `package.json` — remove `openai`; add `@nebula-chat/langchain: "workspace:*"`.
  - `src/env.ts` — rename `OPENAI_API_KEY` → `LLM_API_KEY`; add `LLM_PROVIDER` (`z.enum(['openai','anthropic']).default('openai')`) and `LLM_MODEL` (validated against `MODEL_REGISTRY` keys).
  - `src/modules/chat/chat.service.ts` — replace direct `openai` calls with `streamChat` from the lib; service now only orchestrates DB writes and forwards lib callbacks to the controller.
  - `src/modules/chat/chat.controller.ts` (or route handler) — consumes the `streamChat` callback contract; writes pre-formatted SSE strings (`sseToken(...)`, `sseEnd(...)`) to `reply.raw`.
  - **Files deleted:** `src/modules/chat/chat.tokenizer.ts` (replaced by `countTokens`/`packHistory`), and any provider-specific helpers in `src/modules/chat/chat.utils.ts` (SSE formatters move into the lib; only chat-module-specific utilities, if any, remain).
  - `.env` template — document `LLM_PROVIDER`, `LLM_MODEL`, `LLM_API_KEY`, and the optional `LANGCHAIN_TRACING_V2` / `LANGCHAIN_API_KEY` / `LANGCHAIN_PROJECT` triplet.
- **Migrations required:** none. No DB schema changes; this is a pure server-side refactor of the LLM call path.
- **OpenAPI / contract impact:** none. `POST /api/chat/stream` request/response shapes and SSE event names are preserved verbatim. The frontend Orval client does not need to regenerate. Verified by re-running `pnpm --filter nebula-chat-server run generate:openapi` and diffing `openapi/openapi.yaml`.
- **Rollback plan:** revert the feature branch (e.g. `feat/m-3-langchain`). Concretely: re-add `openai` to `apps/nebula-chat-server/package.json`, restore `chat.tokenizer.ts` and the inline SSE helpers in `chat.utils.ts`, swap `import { streamChat } from '@nebula-chat/langchain'` back to direct `openai` SDK calls, restore `OPENAI_API_KEY` in `src/env.ts`, and delete `libs/langchain/`. No DB rollback is required because no schema changed. Operationally: rotate any deployed `LLM_API_KEY` env back to `OPENAI_API_KEY` in the deploy target before the rollback ships.

## Verification

_To be filled in after the change is verified end-to-end (typecheck and lint at the workspace root, lib build via `pnpm --filter @nebula-chat/langchain build`, server boot with both `LLM_PROVIDER=openai` and `LLM_PROVIDER=anthropic`, a successful streaming chat request through `POST /api/chat/stream` producing identical SSE frames to the pre-refactor baseline, OpenAPI diff showing zero changes, and a LangSmith dashboard entry confirming tracing activates when the env vars are present)._
