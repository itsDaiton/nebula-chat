# AGENTS.md — Worker (`@nebula-chat/worker`)

The worker produces every LLM reply ([ADR-0013](../../docs/adr/0013-worker-app-owns-all-llm-execution.md))
and runs the background jobs ([ADR-0031](../../docs/adr/0031-worker-runs-all-background-jobs.md)). It
consumes BullMQ jobs the server enqueues and appends each reply's events to a per-reply Redis Stream,
which the server relays to the client over SSE
([ADR-0014](../../docs/adr/0014-redis-streams-delivery-and-split-send-stream-api.md)). See the
[root AGENTS.md](../../AGENTS.md) for monorepo-wide commands, git workflow and cross-cutting rules (no
barrels, `type` not `interface`, arrow functions), which apply here too.
The whole Direct reply, from send to relay, is drawn in
[docs/architecture.md → Direct reply](../../docs/architecture.md#direct-reply).

---

## Commands

Run from `apps/worker` (or `pnpm --filter @nebula-chat/worker run <cmd>`, or `pnpm worker <cmd>`, from the root):

```bash
pnpm dev     # nodemon: restarts on src, .env and built lib changes — assumes lib artifacts already built
pnpm start   # node dist/src/worker.js (production)
pnpm test    # vitest run
```

`build` and `typecheck` run through Turbo from the repo root, so the workspace libs build first:
`pnpm turbo run build --filter=@nebula-chat/worker`.

Locally, run it next to the server: both read the same Postgres and Redis. Its `/health` listens on
`:3001`, the server's default `WORKER_URL`.

---

## Boundaries

- **It never imports server code**, and the server never imports worker code. The two share only
  `@nebula-chat/contracts` (job payloads and reply stream events) and `@nebula-chat/db`.
- **Job payloads carry IDs only.** The processor validates each payload against the contract and loads
  everything else from Postgres.
- **It holds the LLM keys**; the server holds none. Model calls go through `llm/`, on `@langchain/core`
  and the provider packages; there is no LLM lib (ADR-0013).
- **Every reply stream ends with `end`**, after an `error` event too, so a reader always knows when to stop.
  A reply its User stopped ends with `end` `{ reason: 'cancelled' }`: the runner polls the server's
  cancel flag while the model streams, aborts the call and persists what it had produced.
  An error event carries the `@nebula-chat/errors` envelope, never a raw internal message.

---

## Layout

The worker does **not** use the server's `name.layer.ts` file naming. Folders and files are camelCase,
and the folder says what kind of thing a file is, so a file carries no layer suffix
(`jobs/directReply.ts`, `agents/orchestrator.ts`, `tools/webFetch.ts`). Test files keep the `.test.ts`
suffix Vitest needs, in a `tests/` folder beside the code. Folders are named after
[CONTEXT.md](../../CONTEXT.md) terms and appear when a ticket first needs them.

`src/` holds `worker.ts` (entry: BullMQ workers, the `/health` server, shutdown, the real dependencies),
`env.ts` (the only `process.env` reader, `OTEL_*` aside as in the server), the `logger.ts`, `db.ts` and
`redis.ts` singletons, and these folders:

- `jobs/` — one BullMQ processor per job type, plumbing only: validate the contracts payload, bind the
  job's IDs, call the feature.
- `directReplies/` — the Direct reply runner (load Session and history, model call, stream events, persist
  the assistant Message), the streamed model call (`streamChat.ts`), its Drizzle queries, and the response
  cache (`replyCache.ts`).
- `llm/` — the model layer: provider clients, structured output, token counting, `packHistory`, the
  concurrency limiter, and the prompt loader. A Model's provider, limits, prices and each provider's default Model come from the
  catalog in `@nebula-chat/contracts` (ADR-0030); the worker keeps no registry of its own.
- `modelCalls/` — the Model call ledger (ADR-0030): `recordModelCall.ts` is the only writer, so a Direct
  reply and, later, a Step share one path; the Drizzle `ModelCallLedger` sits beside it.
- `resources/prompts/` — one static Markdown system prompt per file, no template variables: dynamic
  content goes in the human message. `llm/prompts.ts` reads them once at boot and a missing one fails
  boot; `build` copies the folder into `dist/`, since `tsc` does not.
- `runs/` — the Run (ADR-0033): the LangGraph graph and its nodes (`runGraph.ts`), the runner
  (`executeRun.ts`), Step persistence (`steps.ts`), the Brief, the mapping from the graph's stream to
  reply stream events, the Postgres checkpointer (its own `langgraph` schema, set up at boot), the
  `AgentDefinition` type and the Agent registry, and the Run and Step repositories.
- `agents/` — the Agents only: one file each (Model, prompt, tool grants, parameters, and for an
  Intake Agent its output schema and human-message builder). The Session's Model never applies to an
  Agent.

Folders later tickets add:

- `tools/`: one file per tool.

### Adding a job type

1. Add its payload schema and queue name to `@nebula-chat/contracts`, IDs only.
2. Add `jobs/<jobName>.ts`, exporting a `create<JobName>Processor(deps)` that validates the payload and
   calls the feature. Keep the feature in its own folder, behind injected dependencies.
3. Start a BullMQ `Worker` for it in `worker.ts` on `redis.dedicatedConnection()`, and close it in the
   shutdown handler.

---

## Logging

Same conventions as the server ([docs/logging.md](../../docs/logging.md)). A job logs through a child
bound to every ID in its payload (`user.id`, `nebula.session.id`, `nebula.message.id`,
`nebula.reply.message.id`, `nebula.job.id`) and writes exactly one `info` line when it ends
(`chat.reply.completed` for a Direct reply). A failure is logged once, by the runner that turns it into
the stream's `error` event. Every model call and every cache replay is also recorded once as a Model call,
keyed by the reply's `streamId` (a Step's id in a Run); a failed write is a `warn`, never a failed reply.
A Run writes one `chat.run.completed`, plus a `warn` `chat.run.step.failed` for each Intake Agent that failed. Never log Message content, prompts, completions or Streaming tokens.

A job continues the server's trace: the payload's `traceparent` (and `tracestate`) is extracted into a
consumer span, the model call is a child span of it, and a job without trace context starts its own root.
The server injects the context in `enqueueDirectReply`; the helpers live in `@nebula-chat/otel`.

---

## Testing

The root [Testing](../../AGENTS.md#testing) rules apply. The worker's seam is the **job processor**:
`jobs/tests/directReply.test.ts` calls `createDirectReplyProcessor` with a payload, a scripted fake
model (`streamChat`), in-memory Session and Message storage, an in-memory response cache, an in-memory Model call ledger and an in-memory stream sink, then asserts
on the emitted events, the persisted assistant Message, the recorded Model calls and the logged lines.
`jobs/tests/run.test.ts` does the same for a Run, with scripted models per Agent, LangGraph's
in-memory checkpointer and in-memory Run and Step stores. No test reaches Postgres, Redis or a provider.

Coverage excludes construction-only files (`worker.ts`, `env.ts`, `logger.ts`, `db.ts`, `redis.ts`) and
the Drizzle repository, as in the server. The list lives in `vitest.config.mts` and `matrix.coverage` in
`.github/workflows/build.yml`; change both together.

---

## Environment Variables

`.env` is loaded by the `dev` and `start` scripts through `dotenvx`, never by code ([ADR-0019](../../docs/adr/0019-dotenvx-loads-env-files-in-package-scripts.md)).

| Variable                                                                                                  | Purpose                                                                          |
| --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `OPENAI_API_KEY`                                                                                          | OpenAI API key (set at least one of this or `ANTHROPIC_API_KEY`)                 |
| `ANTHROPIC_API_KEY`                                                                                       | Anthropic API key (set at least one of this or `OPENAI_API_KEY`)                 |
| `DATABASE_URL`                                                                                            | PostgreSQL connection string (the server's database)                             |
| `REDIS_URL`                                                                                               | Redis connection string (the server's Redis)                                     |
| `PORT`                                                                                                    | Port `/health` listens on (default `3001`)                                       |
| `WORKER_CONCURRENCY`                                                                                      | Direct replies, and separately Runs, one instance produces at once (default `5`) |
| `STREAM_TTL_SECONDS`                                                                                      | How long a reply stream outlives its end (default `3600`)                        |
| `LOG_LEVEL`                                                                                               | Log verbosity (default `info`)                                                   |
| `LOG_LEVEL_OVERRIDES`                                                                                     | Per-component levels, comma-separated `component=level`                          |
| `OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_LOGS_EXPORTER`, `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT`, `OTEL_LOG_LEVEL` | As in the server ([docs/logging.md](../../docs/logging.md))                      |
