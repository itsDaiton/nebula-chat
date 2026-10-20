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
- **It holds the LLM keys**; the server holds none. Model calls go through `@nebula-chat/langchain`
  until that lib is dissolved into `llm/` (NEB-358).
- **Every reply stream ends with `end`**, after an `error` event too, so a reader always knows when to stop.
  An error event carries the `@nebula-chat/errors` envelope, never a raw internal message.

---

## Layout

The worker does **not** use the server's `name.layer.ts` file naming. Folders and files are camelCase,
and the folder says what kind of thing a file is, so a file carries no layer suffix
(`jobs/directReply.ts`, `agents/orchestrator.ts`, `tools/webFetch.ts`). Test files keep the `.test.ts`
suffix Vitest needs, in a `tests/` folder beside the code. Folders are named after
[CONTEXT.md](../../CONTEXT.md) terms and appear when a ticket first needs them.

```text
apps/worker/src/
├── worker.ts             # Entry: BullMQ workers, the /health server, shutdown; wires the real dependencies
├── env.ts                # Zod-validated env — the only reader of process.env (OTEL_* aside, as in the server)
├── logger.ts             # The single Pino instance (service.name nebula-chat-worker)
├── db.ts                 # Postgres client (@nebula-chat/db)
├── redis.ts              # Redis toolkit (@nebula-chat/redis): reply streams, BullMQ's connections
├── jobs/                 # One BullMQ processor per job type, plumbing only
│   └── directReply.ts    #   validate the contracts payload, bind the job's IDs, call the feature
└── directReplies/        # The Direct reply runner and, later, the response cache
    ├── runDirectReply.ts #   load Session + history, model call, stream events, persist the assistant Message
    ├── directReplyRepository.ts # Its Drizzle queries
    └── systemPrompt.ts
```

Folders later tickets add:

- `llm/`: the model layer (providers, token counting, `packHistory`, the concurrency limiter), when the
  langchain lib is dissolved.
- `runs/`: the Run graph, its nodes, checkpointer, middleware, stream-event mapping, and the Run and Step
  repositories.
- `agents/`: one file per Agent definition, plus the registry.
- `tools/`: one file per tool.
- `resources/prompts/`: one static Markdown system prompt per Agent.

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
the stream's `error` event. Never log Message content, prompts, completions or Streaming tokens.

---

## Testing

The root [Testing](../../AGENTS.md#testing) rules apply. The worker's seam is the **job processor**:
`jobs/tests/directReply.test.ts` calls `createDirectReplyProcessor` with a payload, a scripted fake
model (`streamChat`), in-memory Session and Message storage, and an in-memory stream sink, then asserts
on the emitted events, the persisted assistant Message and the logged lines. No test reaches Postgres,
Redis or a provider.

Coverage excludes construction-only files (`worker.ts`, `env.ts`, `logger.ts`, `db.ts`, `redis.ts`) and
the Drizzle repository, as in the server. The list lives in `vitest.config.mts` and `matrix.coverage` in
`.github/workflows/build.yml`; change both together.

---

## Environment Variables

`.env` is loaded by the `dev` and `start` scripts through `dotenvx`, never by code ([ADR-0019](../../docs/adr/0019-dotenvx-loads-env-files-in-package-scripts.md)).

| Variable                                                                                                  | Purpose                                                          |
| --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `OPENAI_API_KEY`                                                                                          | OpenAI API key (set at least one of this or `ANTHROPIC_API_KEY`) |
| `ANTHROPIC_API_KEY`                                                                                       | Anthropic API key (set at least one of this or `OPENAI_API_KEY`) |
| `DATABASE_URL`                                                                                            | PostgreSQL connection string (the server's database)             |
| `REDIS_URL`                                                                                               | Redis connection string (the server's Redis)                     |
| `PORT`                                                                                                    | Port `/health` listens on (default `3001`)                       |
| `WORKER_CONCURRENCY`                                                                                      | Direct replies one instance produces at once (default `5`)       |
| `LOG_LEVEL`                                                                                               | Log verbosity (default `info`)                                   |
| `LOG_LEVEL_OVERRIDES`                                                                                     | Per-component levels, comma-separated `component=level`          |
| `OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_LOGS_EXPORTER`, `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT`, `OTEL_LOG_LEVEL` | As in the server ([docs/logging.md](../../docs/logging.md))      |
