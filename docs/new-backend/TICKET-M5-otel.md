# M-5 — `@nebula-chat/otel` (Pino + OpenTelemetry)

## Ticket metadata

| Field          | Value                                          |
| -------------- | ---------------------------------------------- |
| **ID**         | M-5                                            |
| **Package**    | `libs/otel` → published as `@nebula-chat/otel` |
| **Depends on** | Nothing — fully independent lib ticket         |
| **Blocks**     | Nothing                                        |
| **Standalone** | Yes                                            |
| **ADR**        | [ADR-0007](../adr/0007-otel-lib-and-fastify-native-logger.md) |

> **This ticket was corrected on 2026-09-13.** Its original implementation sketch was written before M-1 landed and specified a `fastifyLoggerPlugin` built on `pino-http`. That conflicts with the `Fastify({ logger })` call M-1 actually shipped in `src/app.ts` — registering both would log every request twice, under two `reqId` schemes. It also pinned versions that are now behind, and used a `"build": "tsc"` package shape that neither `libs/db` nor `libs/langchain` follows. See ADR-0007 for the reasoning; the spec below is authoritative.

## Objective

Create `libs/otel` providing a Pino logger factory and OpenTelemetry SDK initialisation. `apps/nebula-chat-server` calls `initTelemetry()` as the very first statement in `server.ts` before any other import, and sources its Fastify logger from `createLogger()`.

> **Workaround to remove:** `apps/nebula-chat-server/src/logger.ts` is a temporary standalone Pino instance added during M-1 so that non-request-scoped code (`src/cache/cache.client.ts`, `src/cache/cache.service.ts`, and the startup error handler in `src/server.ts`) could drop `console.*` calls before M-5 was ready. **Delete it** and replace its import sites with `createLogger()` from `@nebula-chat/otel`. Also remove `pino` and `pino-pretty` from `apps/nebula-chat-server/package.json` — Pino arrives transitively through the lib.

## Acceptance criteria

- [ ] `libs/otel/` exists, following the `libs/langchain` package shape (tsup dual ESM+CJS, `exports` map, `publishConfig` to GitHub Packages)
- [ ] `libs/otel` is registered in `release-please-config.json` as component `nebula-chat-otel`
- [ ] `createLogger(options)` returns a configured Pino logger
- [ ] `initTelemetry(serviceName)` initialises the OTel SDK when `OTEL_EXPORTER_OTLP_ENDPOINT` is set
- [ ] `initTelemetry()` is a no-op when the env var is absent (no crash, no error output)
- [ ] `initTelemetry('nebula-chat-server')` is the first statement in `src/server.ts`, above every other import
- [ ] `src/app.ts` builds its Fastify instance with `logger: createLogger(...)`
- [ ] **No `pino-http` dependency and no Fastify logger plugin** — request logging stays Fastify-native (ADR-0007)
- [ ] `src/logger.ts` is deleted and all three import sites repointed
- [ ] `pino` and `pino-pretty` removed from `apps/nebula-chat-server/package.json`
- [ ] `OTEL_EXPORTER_OTLP_ENDPOINT` declared as optional in `src/env.ts`
- [ ] An OTLP collector service exists in `apps/nebula-chat-server/docker-compose.yml`
- [ ] A single HTTP request produces exactly **one** request/response log pair, sharing one `reqId`

---

## Directory structure

```
libs/otel/
├── src/
│   ├── logger.ts         # createLogger factory
│   ├── tracing.ts        # initTelemetry
│   └── index.ts
├── package.json
├── tsconfig.json
└── tsup.config.ts
```

---

## Implementation

### File: `libs/otel/package.json`

Match `libs/db` and `libs/langchain`. **Resolve the `@opentelemetry/*` versions at install time** (`pnpm add`) rather than copying pins from this file — the OTel JS packages move fast and the SDK/exporter/instrumentation versions must agree with each other. `@opentelemetry/api` is the one to keep on a caret range, since duplicate `api` copies in the tree break context propagation silently.

```json
{
  "name": "@nebula-chat/otel",
  "version": "0.1.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "default": "./dist/index.js"
    }
  },
  "publishConfig": {
    "registry": "https://npm.pkg.github.com",
    "access": "restricted"
  },
  "scripts": {
    "build": "tsup",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "pino": "^10.3.1",
    "@opentelemetry/api": "^1.9.0",
    "@opentelemetry/sdk-node": "latest-at-install",
    "@opentelemetry/auto-instrumentations-node": "latest-at-install",
    "@opentelemetry/exporter-trace-otlp-http": "latest-at-install"
  },
  "devDependencies": {
    "@types/node": "catalog:",
    "pino-pretty": "^13.0.0",
    "tsup": "^8.5.0",
    "typescript": "^5.9.3"
  }
}
```

`pino-pretty` is a **devDependency**: Pino loads it via a worker thread by name only, and it is only ever requested when `pretty: true`, which is development-only.

### File: `libs/otel/tsup.config.ts`

```ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  outDir: 'dist',
  sourcemap: true,
  target: 'es2022',
  external: [
    'pino',
    'pino-pretty',
    '@opentelemetry/api',
    '@opentelemetry/sdk-node',
    '@opentelemetry/auto-instrumentations-node',
    '@opentelemetry/exporter-trace-otlp-http',
  ],
});
```

### File: `libs/otel/src/logger.ts`

```ts
import pino from 'pino';

export interface LoggerOptions {
  level?: string;
  pretty?: boolean;
}

export function createLogger(options: LoggerOptions = {}) {
  return pino({
    level: options.level ?? process.env.LOG_LEVEL ?? 'info',
    transport: options.pretty
      ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } }
      : undefined,
  });
}

export type Logger = ReturnType<typeof createLogger>;
```

### File: `libs/otel/src/tracing.ts`

Reads `process.env` directly and **not** the server's Zod-validated `env` — a published lib must not depend on one consumer's env schema, and importing `src/env.ts` here would pull `dotenv` and Zod into the module graph ahead of the SDK, defeating the import ordering that makes auto-instrumentation work.

```ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

let sdk: NodeSDK | null = null;

export function initTelemetry(serviceName: string): void {
  if (!process.env.OTEL_EXPORTER_OTLP_ENDPOINT) return;

  sdk = new NodeSDK({
    serviceName,
    traceExporter: new OTLPTraceExporter(),
    instrumentations: [getNodeAutoInstrumentations()],
  });

  sdk.start();

  process.on('SIGTERM', () => {
    void sdk?.shutdown();
  });
}
```

### File: `libs/otel/src/index.ts`

```ts
export { createLogger } from './logger';
export type { LoggerOptions, Logger } from './logger';
export { initTelemetry } from './tracing';
```

There is **no** `fastify-logger.plugin.ts` and no `pino-http`. See ADR-0007.

---

## Consuming in `apps/nebula-chat-server`

### 1. Workspace dependency

```json
{
  "dependencies": {
    "@nebula-chat/otel": "workspace:*"
  }
}
```

Remove `pino` from `dependencies` and `pino-pretty` from `devDependencies` in the same edit.

### 2. `src/server.ts` — telemetry first

```ts
// MUST be the first two statements — before any other import.
// Auto-instrumentation patches modules as they load, so anything imported
// above this line is never instrumented. Do not reorder.
import { initTelemetry } from '@nebula-chat/otel';
initTelemetry('nebula-chat-server');

import { createLogger } from '@nebula-chat/otel';
import { env } from '@backend/env';
import { buildApp } from '@backend/app';

const logger = createLogger({
  level: env.LOG_LEVEL,
  pretty: env.NODE_ENV === 'development',
});

// ...existing start() body, with logger.error for startup failure
```

### 3. `src/app.ts` — Fastify sources its logger from the lib

Replace the inline Pino config object in the `Fastify({ ... })` call:

```ts
import { createLogger } from '@nebula-chat/otel';

const app = Fastify({
  logger: createLogger({
    level: env.LOG_LEVEL,
    pretty: env.NODE_ENV === 'development',
  }),
  trustProxy: resolveTrustProxy(),
});
```

Fastify handles request/response logging, `reqId`, serializers, and `req.log` child loggers itself. Do not add a `pino-http` hook on top.

### 4. `src/env.ts` — declare the var

```ts
OTEL_EXPORTER_OTLP_ENDPOINT: z.url().optional(),
```

Documents and validates the var for the app. The lib still reads `process.env` directly, so this declaration does not gate the lib's read — a malformed URL surfaces as an exporter error at runtime, not a boot-time Zod failure.

### 5. Repoint the remaining `src/logger.ts` consumers

`src/cache/cache.client.ts` and `src/cache/cache.service.ts` both `import { logger } from '@backend/logger'`. Replace with a module-level `createLogger()` call, then **delete `src/logger.ts`**. Verify:

```bash
grep -rn "@backend/logger" apps/nebula-chat-server/src/
```

### 6. `release-please-config.json` — register the package

```json
"libs/otel": {
  "release-type": "node",
  "component": "nebula-chat-otel",
  "include-component-in-tag": true
}
```

Without this the lib never releases, and the library-triggered server deploy from `8c68245` never fires for it.

### 7. Local OTLP collector

Add a collector service to `apps/nebula-chat-server/docker-compose.yml`, matching the hardening style of the existing `db` and `redis` services (loopback-bound port, `no-new-privileges`, `cap_drop: ALL`). Set `OTEL_EXPORTER_OTLP_ENDPOINT` against it in local `.env` to exercise the enabled path; leave it unset to exercise the no-op path.

---

## Verification

```bash
pnpm install
pnpm --filter @nebula-chat/otel build
pnpm typecheck
pnpm lint
```

Then, manually:

1. Boot with `OTEL_EXPORTER_OTLP_ENDPOINT` **unset** — server starts, no OTel output, no crash.
2. Boot with it pointed at the compose collector — `GET /health` produces a trace in the collector's output.
3. Confirm one request yields exactly **one** request/response log pair with a single `reqId`. Two pairs means a `pino-http` hook crept back in.
