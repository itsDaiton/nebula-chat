---
paths:
  - 'apps/server/src/plugins/**'
  - 'apps/server/src/logger.ts'
  - 'apps/server/src/server.ts'
  - 'apps/server/src/**/*.hook.ts'
  - 'apps/server/src/**/*.service.ts'
  - 'libs/otel/**'
---

# Logging

The full conventions are in [docs/logging.md](../../docs/logging.md). The rules that bite:

- **Every line goes through `logEvent(logger, level, event, attributes, msg)`** from `@nebula-chat/otel`,
  or through a stamped adapter. An event name or attribute key missing from the catalogue
  (`libs/otel/src/events.ts`, `libs/otel/src/attributes.ts`) is a compile error — add it there.
- **Inside a request, log through `req.log`.** It carries `http.request.id`, and the User once a gate has
  run. Outside a request, use `@server/logger`. Never `console`.
- **Log an error once, where it is handled**, under `err` (never `error`; ESLint rejects it). Code that
  throws does not also log. A 4xx writes no line of its own.
- **One `info` line per unit of work** (`http.request.completed`, `chat.reply.completed`); progress inside
  it is `debug`.
- **Never log** Message content, prompts, completions, Streaming tokens, emails, names, cookies,
  `Authorization` headers or API keys. Opaque ids are fine.
