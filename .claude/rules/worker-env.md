---
paths:
  - 'apps/worker/src/env.ts'
  - 'apps/worker/.env*'
  - 'apps/worker/nodemon.json'
---

# Environment Variables

`apps/worker/.env` is loaded by the `dev` and `start` scripts through `dotenvx`, never by code ([ADR-0019](../../docs/adr/0019-dotenvx-loads-env-files-in-package-scripts.md)).

| Variable                                                                                                  | Purpose                                                          |
| --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `OPENAI_API_KEY`                                                                                          | OpenAI API key (set at least one of this or `ANTHROPIC_API_KEY`) |
| `ANTHROPIC_API_KEY`                                                                                       | Anthropic API key (set at least one of this or `OPENAI_API_KEY`) |
| `DATABASE_URL`                                                                                            | PostgreSQL connection string (the server's database)             |
| `REDIS_URL`                                                                                               | Redis connection string (the server's Redis)                     |
| `PORT`                                                                                                    | Port `/health` listens on (default `3001`)                       |
| `WORKER_CONCURRENCY`                                                                                      | Direct replies one instance produces at once (default `5`)       |
| `RUN_CONCURRENCY`                                                                                         | Runs one instance executes at once (default `3`)                 |
| `RUN_TURN_CAP`                                                                                            | Orchestrator turns before a forced handoff (default `6`)         |
| `RUN_PARALLEL_DELEGATES`                                                                                  | Delegate Agents one Run executes at once (default `4`)           |
| `RUN_TOKEN_BUDGET`                                                                                        | The Run budget, in tokens across all Steps (default `60000`)     |
| `RUN_HANDOFF_THRESHOLD`                                                                                   | Share of the Run budget that forces the handoff (default `0.85`) |
| `RUN_DELEGATE_TIMEOUT_MS`                                                                                 | How long a delegate Step may take (default `60000`)              |
| `RUN_DELEGATE_TOOL_CALL_CAP`                                                                              | Tool calls one delegate execution may make (default `6`)         |
| `TAVILY_API_KEY`                                                                                          | Tavily key for `web_search`; worker only (unset: keyless in dev) |
| `WEB_FETCH_MAX_BYTES`                                                                                     | Largest page `web_fetch` reads (default `2000000`)               |
| `WEB_FETCH_TIMEOUT_MS`                                                                                    | Deadline of one fetch or search (default `10000`)                |
| `WEB_FETCH_MAX_REDIRECTS`                                                                                 | Redirects `web_fetch` follows (default `5`)                      |
| `WEB_FETCH_MAX_CHARS`                                                                                     | Text `web_fetch` returns before cutting (default `12000`)        |
| `RUN_TIMEOUT_MS`                                                                                          | How long a Run may take before it fails (default `300000`)       |
| `STREAM_TTL_SECONDS`                                                                                      | How long a reply stream outlives its end (default `3600`)        |
| `LOG_LEVEL`                                                                                               | Log verbosity (default `info`)                                   |
| `LOG_LEVEL_OVERRIDES`                                                                                     | Per-component levels, comma-separated `component=level`          |
| `OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_LOGS_EXPORTER`, `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT`, `OTEL_LOG_LEVEL` | As in the server ([docs/logging.md](../../docs/logging.md))      |

> **`env.ts` rule:** every variable is Zod-validated in `src/env.ts` and fails boot loudly. Never read `process.env.*`
> anywhere else in the worker; import from `@worker/env`. As in the server, `@nebula-chat/otel` reads the `OTEL_*`
> variables itself ([server-env](./server-env.md) says why).
