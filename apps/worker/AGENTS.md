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
  A Run attempt that BullMQ will retry is the exception: it leaves its stream open for the resume.
  A reply its User stopped ends with `end` `{ reason: 'cancelled' }`: the runner polls the server's
  cancel flag while the model streams, aborts the call and persists what it had produced.
  An error event carries the `@nebula-chat/errors` envelope, never a raw internal message.

---

## Layout

The worker does **not** use the server's `name.layer.ts` file naming. Folders and files are camelCase,
and the folder says what kind of thing a file is, so a file carries no layer suffix
(`jobs/directReply.ts`, `agentIo/orchestrator.ts`, `tools/webFetch.ts`). Test files keep the `.test.ts`
suffix Vitest needs, in a `tests/` folder beside the code. Folders are named after
[GLOSSARY.md](../../GLOSSARY.md) terms and appear when a ticket first needs them.

`src/` holds `worker.ts` (entry: BullMQ workers, the `/health` server, shutdown, the real dependencies),
`env.ts` (the only `process.env` reader, `OTEL_*` aside as in the server), the `logger.ts`, `db.ts` and
`redis.ts` singletons, and these folders:

- `jobs/` — one BullMQ processor per job type, plumbing only: validate the contracts payload, bind the
  job's IDs, call the feature.
- `directReplies/` — the Direct reply runner (load Session and history, model call, stream events, persist
  the assistant Message), the streamed model call (`streamChat.ts`), its Drizzle queries, and the response
  cache (`replyCache.ts`).
- `llm/` — the model layer: provider clients, structured output, token counting, `packHistory`, the
  concurrency limiter, the prompt loader, and the key resolver (`keyResolver.ts`: one per job, every Model call loads its provider key from it afresh, the stored Own key the payload references or else the Operator key, never a fallback from one to the other). A Model's provider, limits, prices and each provider's default Model come from the
  catalog in `@nebula-chat/contracts` (ADR-0030); the worker keeps no registry of its own.
- `ownKeys/` — the Own key (ADR-0037, GLOSSARY.md): `ownKeyCrypto.ts` decrypts and re-wraps RSA-OAEP ciphertext by key version
  (`node:crypto` only), the Drizzle `OwnKeyStore` sits beside it, `validateOwnKey.ts` checks a stored key against its provider's
  model-list endpoint, and `rewrapOwnKeys.ts` moves every key to the current version. Both are jobs (`own-key-validation`,
  `own-key-rewrap`) the server enqueues; the worker only consumes them.
- `purge/` — the daily Purge (ADR-0028): `runPurge.ts` picks the Users and Guests past their thresholds, erases each in
  its own transaction and appends one system Audit entry of counts; the Drizzle `PurgeStore` sits beside it. `worker.ts`
  upserts the job scheduler (fixed id, `0 3 * * *` UTC) so every instance shares one schedule.
- `modelCalls/` — the Model call ledger (ADR-0030): `recordModelCall.ts` is the only writer, so a Direct
  reply and, later, a Step share one path; the Drizzle `ModelCallLedger` sits beside it. `scrubError.ts` cleans a caught model error of any key it echoes before it is stored, streamed or logged.
- `resources/prompts/` — one static Markdown system prompt per file, no template variables: dynamic
  content goes in the human message. `llm/prompts.ts` reads them once at boot and a missing one fails
  boot; `build` copies the folder into `dist/`, since `tsc` does not.
- `runs/` — the Run (ADR-0033): the LangGraph graph and its nodes (`runGraph.ts`), the runner
  (`executeRun.ts`), Step persistence (`steps.ts`), the Brief, the Orchestrator's `createAgent` loop
  and its middleware (`orchestrator.ts`), the delegate-Agent-as-tool adapter, the findings the Output
  Agent reads, the mapping from the graph's stream to reply stream events, the Postgres checkpointer
  (its own `langgraph` schema, set up at boot), the Agent catalog loader (`agentCatalog.ts`: schema, `AGENTS` and
  `DELEGATES`; `agentHash.ts`: the hash, `node:crypto` only so the root stamp script can load it), the `AgentDefinition` types inferred from it, and the Run and Step repositories.
- `agents/` — the Agent catalog data only: one `<name>.json` per Agent (Model, prompt, tool grants, parameters; a
  delegate also its `description`). The Session's Model never applies to an Agent.
- `agentIo/` — what an Intake, Output or Orchestrator Agent takes in and gives back: its output schema and
  human-message builder, one file each. The delegates have none: they take a plain task.
- `tools/` — tool definitions only, one file each (`webSearch.ts`, `webFetch.ts`): the LangChain tool, its
  Zod arguments and its config. `worker.ts` builds them into the Run's `Toolbox`; `runs/delegateTool.ts` gives
  a delegate the ones its definition grants, in its own capped loop.
- `web/` — the web layer the tools call: the Tavily client (Search and Extract) and `WebToolError`.

A Run job is retried by BullMQ (`RUN_JOB_ATTEMPTS` and `RUN_JOB_BACKOFF_MS` are the server's env, since the
server adds the job). `executeRun` starts the graph only on a thread with no checkpoint: pending work resumes
with `null` input, and a finished graph only ends the Run. A failure with tries left is rethrown, leaving the
Run `running` and its checkpoints in place; the last try ends the Run `failed` with the error on its
`run-finished` event and deletes the checkpoints. A resumed Run's token total is seeded from its completed
Steps, a re-run Step's Model call gets its own ledger row (`<stepId>:<attempt>`), and a failed Run persists no
assistant Message: its error event is the explanation.

A Run may pause once on a Clarifying question (ADR-0033 §6). The Orchestrator's `askUser` tool (`runs/askUserTool.ts`)
upserts the question Message, then interrupts. `executeRun` reads the interrupt from the root graph's pending task, sets the
Run `waiting`, appends `run-waiting`, ends the stream, schedules the delayed `clarifying-question-timeout` job
(`jobs/clarifyingQuestionTimeout.ts`, `CLARIFYING_QUESTION_TIMEOUT_MS`) and completes: a waiting Run holds no job. A Run job
whose payload has `resume` continues from the checkpoint with `Command({ resume })`; `answerMessageId: null` is the timeout and
ends the Run `partial`. The timeout job settles the Run with a conditional update on `status = waiting`, so it and a
server-side answer settle once: it enqueues that resume job, or, with the Run's cancel flag raised, ends the Run `cancelled` and deletes its checkpoints.

### The Agent catalog

Each Agent's definition is static JSON in `agents/<name>.json`, parsed when `runs/agentCatalog.ts` loads: an unknown Model,
tool or prompt, a name that does not match its file, a missing or extra Agent, or an out-of-range parameter fails boot. The
set is fixed (four Agents, three delegates), which keeps `AGENTS.output` and the like literally typed; `kind` decides the
registry. Each file carries a `version` and a `hash` over its definition and its prompt's Markdown text. Edit an Agent or a
prompt, then run `pnpm catalog:stamp` from the root: it re-stamps only stale files, and `runs/tests/agentCatalog.test.ts`
fails until you do. Intake Agents run on cheap Models and the Output Agent on a mid-tier one; the Orchestrator is on a strong
Model because it decides what the Run does, and its only tools are the delegates, none of which is given another Agent. The
`researcher` is the one Agent with the web. The hash only detects drift; nothing records it on a Run (ADR-0030 has the convention; [docs/catalogs.md](../../docs/catalogs.md) covers both catalogs and adding an Agent). Adding, changing or removing an Agent
also updates the list in [docs/catalog.md](../../docs/catalog.md).

### Own keys

A job's `keyRefs` names the stored Own key per provider; a provider without one uses the Operator key. The resolver loads the row by
that id (checking it is the job's User's, for that provider, and `valid`), decrypts it and hands out the plaintext per call: it is
never put in state, `configurable`, a Step, a stream event or a log line, and `scrubError` knows every key a job has loaded. A model
call runs inside `keys.guard`: a 401 marks the key `invalid` and fails with `InvalidOwnKey`, a 429 fails with `TooManyRequests`
and leaves it valid, and neither retries on the Operator key. An Intake or delegate Agent failing that way ends the Run instead of being
worked around. The Orchestrator's and a delegate's tool loop load their key once per execution of the node, so a resume or retry
loads it again. Rotation: [docs/own-key-rotation.md](../../docs/own-key-rotation.md).

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
A Run writes one `chat.run.completed` (a failure with job retries left writes a `warn` `chat.run.retrying` instead), plus a `warn` `chat.run.step.failed` for each Intake or delegate Agent that failed. Never log Message content, prompts, completions or Streaming tokens.

A job continues the server's trace: the payload's `traceparent` (and `tracestate`) is extracted into a
consumer span, the model call is a child span of it, and a job without trace context starts its own root.
The server injects the context in `enqueueDirectReply`; the helpers live in `@nebula-chat/otel`.

---

## Testing

The root [Testing](../../AGENTS.md#testing) rules apply. The worker's seam is the **job processor**:
`jobs/tests/directReply.test.ts` calls `createDirectReplyProcessor` with a payload, a scripted fake
model (`streamChat`), in-memory Session and Message storage, an in-memory response cache, an in-memory Model call ledger and an in-memory stream sink, then asserts
on the emitted events, the persisted assistant Message, the recorded Model calls and the logged lines.
`jobs/tests/run.test.ts` does the same for a Run, with scripted models per Agent (the Orchestrator's
script decides each reply from the messages it is sent), LangGraph's in-memory checkpointer and
in-memory Run and Step stores, and a Toolbox whose search provider is faked. Each tool is
also tested at its own seam (`tools/tests/`), with faked Tavily responses. `jobs/tests/directReply.test.ts` and `run.test.ts` also cover the Own key at this seam, with real `node:crypto` and a generated keypair (`ownKeys/tests/ownKeyFakes.ts`). `jobs/tests/purge.test.ts` runs the Purge processor over in-memory Users and a fake clock. No test
reaches Postgres, Redis, a provider or the web.

Coverage excludes construction-only files (`worker.ts`, `env.ts`, `logger.ts`, `db.ts`, `redis.ts`) and
the Drizzle repository, as in the server. The list lives in `vitest.config.mts` and `matrix.coverage` in
`.github/workflows/build.yml`; change both together.

---

## Topic rules

Each topic lives in a path-scoped rule under [`.claude/rules/`](../../.claude/rules/). Claude Code loads one
when it reads a matching file; any other agent opens the file when it works in that area.

| Rule                                            | Covers                                   |
| ----------------------------------------------- | ---------------------------------------- |
| [worker-env](../../.claude/rules/worker-env.md) | `.env` loading, `env.ts`, every variable |
