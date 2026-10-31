---
paths:
  - 'apps/server/src/env.ts'
  - 'apps/server/src/test/setup.ts'
  - 'apps/server/.env*'
  - 'apps/server/nodemon.json'
---

# Environment Variables

`apps/server/.env` is loaded by package scripts, never by code: `dev`, `start` and the `@nebula-chat/db`
`db:*` scripts wrap their command in `dotenvx run -f <file> --ignore=MISSING_ENV_FILE --`. A variable already set by
the shell, CI or Render wins over the file, and a missing file is silent. `test` and `generate:openapi` deliberately
read no `.env`, so a test run behaves the same on a developer machine as in CI. A new script that needs the file must
be wrapped the same way. See [ADR-0019](../../docs/adr/0019-dotenvx-loads-env-files-in-package-scripts.md).

| Variable                           | Purpose                                                                                                                   |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `WORKER_URL`                       | The worker's public URL; the server pings its `/health` on every enqueue to wake it (default `http://localhost:3001`)     |
| `STREAM_CANCEL_TTL_SECONDS`        | How long a stop request waits for the worker to see it (default `900`)                                                    |
| `RUN_JOB_ATTEMPTS`                 | Tries BullMQ gives a Run job; a retry resumes the Run from its checkpoint (default `3`)                                   |
| `RUN_JOB_BACKOFF_MS`               | Base of the exponential backoff between a Run job's tries (default `5000`)                                                |
| `DATABASE_URL`                     | PostgreSQL connection string                                                                                              |
| `REDIS_URL`                        | Redis connection (e.g. `redis://localhost:6380`)                                                                          |
| `CLIENT_URL`                       | Frontend origin for CORS (e.g. `http://localhost:5173`); must be the same site as the API ([auth.md](../../docs/auth.md)) |
| `SERVER_URL`                       | Backend public URL, allowed as a CORS origin alongside `CLIENT_URL` (e.g. for Swagger UI at `/docs`)                      |
| `BETTER_AUTH_SECRET`               | better-auth secret — signs sessions and the session cookie cache (required)                                               |
| `BETTER_AUTH_URL`                  | App base URL for better-auth cookies/redirects (required, e.g. `http://localhost:3000`)                                   |
| `RESEND_API_KEY`                   | Resend API key for the verification and password-reset emails (required; ADR-0021)                                        |
| `EMAIL_FROM`                       | Sender for those emails — `address` or `Name <address>` on a Resend-verified domain (required)                            |
| `GUEST_MESSAGE_ALLOWANCE`          | Guest `user`-message cap before registration is required (int, default `10`; ADR-0010)                                    |
| `GOOGLE_CLIENT_ID`                 | Google OAuth client id for social sign-in. Set with `GOOGLE_CLIENT_SECRET`, or leave both unset to turn Google off        |
| `GOOGLE_CLIENT_SECRET`             | Google OAuth client secret (paired with `GOOGLE_CLIENT_ID`; only one of the two set fails boot)                           |
| `GITHUB_CLIENT_ID`                 | GitHub OAuth app client id for social sign-in. Set with `GITHUB_CLIENT_SECRET`, or leave both unset to turn GitHub off    |
| `GITHUB_CLIENT_SECRET`             | GitHub OAuth app client secret (paired with `GITHUB_CLIENT_ID`; only one of the two set fails boot)                       |
| `PORT`                             | Port to listen on (default `3000`)                                                                                        |
| `LOG_LEVEL`                        | Log verbosity (default `info`; set to `debug`/`warn` etc. in prod)                                                        |
| `LOG_LEVEL_OVERRIDES`              | Per-component levels, comma-separated `component=level` (e.g. `redis=debug,auth=warn`); unknown level fails boot          |
| `OTEL_EXPORTER_OTLP_ENDPOINT`      | OTLP collector URL. Unset = spans are not exported (the tracer still runs, so lines keep their `trace_id`)                |
| `OTEL_LOGS_EXPORTER`               | `otlp` also exports every log line over OTLP (to Loki), given an endpoint. Unset/`none` = stdout only (ADR-0023)          |
| `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT` | Logs-only OTLP URL, used as is (`…/v1/logs`); unset = logs go to `OTEL_EXPORTER_OTLP_ENDPOINT` + `/v1/logs`               |
| `OTEL_LOG_LEVEL`                   | Verbosity of the OTel SDK's own diagnostics (default `error`; `none`/`warn`/`info`/`debug`/`verbose`/`all`)               |
| `OPERATOR_TOKEN`                   | Shared operator secret (32+ chars) for `/api/internal/*`, e.g. changing log levels at runtime. Unset = those routes 404   |
| `SUPABASE_URL`                     | Supabase project URL for Profile image storage (ADR-0022). Set all three storage vars or none; none = uploads off         |
| `SUPABASE_SECRET_KEY`              | Supabase secret key; server-only, writes the Profile image bucket                                                         |
| `PROFILE_IMAGE_BUCKET`             | Public bucket for Profile images: `profile-images-dev` locally, `profile-images` in production                            |

> **`env.ts` rule:** All env vars are Zod-validated in `src/env.ts` and fail loudly at startup before any listener is bound. Never read `process.env.*` directly anywhere in the backend — always import from `@server/env`. The only code that touches `process.env` is what runs before `env.ts` parses it: `src/test/setup.ts` and `src/scripts/generate-openapi.ts`, which fill placeholders with `??=`.
>
> **One exception:** `@nebula-chat/otel` reads the `OTEL_*` variables (`OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_LOGS_EXPORTER`, `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT`, `OTEL_LOG_LEVEL`) from `process.env` itself — a published lib can't depend on one consumer's env schema.
> They are still declared in `src/env.ts`. See [ADR-0007](../../docs/adr/0007-otel-lib-and-fastify-native-logger.md) for why, and [docs/logging.md](../../docs/logging.md) for how logging works.

The `BETTER_AUTH_*`, `GUEST_MESSAGE_ALLOWANCE` and `GOOGLE_*`/`GITHUB_*` vars feed `@nebula-chat/auth`. See [docs/auth.md](../../docs/auth.md) for how authentication works (the route gates, the message allowance, and the claim) and [ADR-0010](../../docs/adr/0010-better-auth-for-auth.md) for the decisions behind it.
