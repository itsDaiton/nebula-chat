# M-5 — `@nebula-chat/otel` (Pino + OpenTelemetry)

## Ticket metadata

| Field          | Value                                                         |
| -------------- | ------------------------------------------------------------- |
| **ID**         | M-5                                                           |
| **Package**    | `libs/otel` → published as `@nebula-chat/otel`                |
| **Depends on** | Nothing — fully independent lib ticket                        |
| **Blocks**     | Nothing                                                       |
| **Standalone** | Yes                                                           |
| **ADR**        | [ADR-0007](../adr/0007-otel-lib-and-fastify-native-logger.md) |

> **This ticket was corrected on 2026-09-13.** Its original implementation sketch was written before M-1 landed and specified a `fastifyLoggerPlugin` built on `pino-http`. That conflicts with the `Fastify({ logger })` call M-1 actually shipped in `src/app.ts` — registering both would log every request twice, under two `reqId` schemes. It also pinned versions that are now behind, and used a `"build": "tsc"` package shape that neither `libs/db` nor `libs/langchain` follows. See ADR-0007 for the reasoning; the spec below is authoritative.

## Objective

Create `libs/otel` providing a Pino logger factory and OpenTelemetry SDK initialisation. `apps/nebula-chat-server` calls `initTelemetry()` at the top of `server.ts`, ahead of every import that reaches an instrumented module, and sources its Fastify logger from `createLogger()`.

> **Workaround to remove:** `apps/nebula-chat-server/src/logger.ts` is a temporary standalone Pino instance added during M-1 so that non-request-scoped code (`src/cache/cache.client.ts`, `src/cache/cache.service.ts`, and the startup error handler in `src/server.ts`) could drop `console.*` calls before M-5 was ready. **Delete it** and replace its import sites with `createLogger()` from `@nebula-chat/otel`. Also remove `pino` and `pino-pretty` from `apps/nebula-chat-server/package.json` — Pino arrives transitively through the lib.

## Acceptance criteria

- [x] `libs/otel/` exists, following the `libs/langchain` package shape (tsup dual ESM+CJS, `exports` map, `publishConfig` to GitHub Packages, `.gitignore`)
- [x] `libs/otel` is registered in `release-please-config.json` as component `nebula-chat-otel`
- [x] `createLogger(options)` returns a configured Pino logger
- [x] `initTelemetry(serviceName)` initialises the OTel SDK when `OTEL_EXPORTER_OTLP_ENDPOINT` is set
- [x] `initTelemetry()` is a no-op when the env var is absent (no crash, no error output)
- [x] `initTelemetry('nebula-chat-server')` runs at the top of `src/server.ts`, above every import that reaches an instrumented module — see [Import ordering](#import-ordering-what-first-statement-means-in-practice)
- [x] `src/app.ts` builds its Fastify instance from a `createLogger(...)` instance
- [x] **No `pino-http` dependency and no Fastify logger plugin** — request logging stays Fastify-native (ADR-0007)
- [x] `src/logger.ts` is deleted and all its import sites repointed
- [x] `pino` and `pino-pretty` removed from `apps/nebula-chat-server/package.json`
- [x] `OTEL_EXPORTER_OTLP_ENDPOINT` declared as optional in `src/env.ts`
- [x] The OTel SDK's own diagnostics appear in the Pino stream, tagged `component: 'otel'` — never on `console.*`
- [x] The diagnostic level is env-driven via `OTEL_LOG_LEVEL`, falling back to `error` (not `none`) for an absent or unrecognised value
- [x] Exactly one Pino instance on the server's runtime path: `src/logger.ts` exports it, `src/server.ts` injects it into both `initTelemetry` and `buildApp`, and `buildApp` falls back to the same import (`load-env.ts` keeps a separate pre-env bootstrap instance)
- [x] A local trace backend (`grafana/otel-lgtm`, OTLP-native) exists in `apps/nebula-chat-server/docker-compose.yml`
- [x] `OTEL_LOG_LEVEL` is effective independently of `LOG_LEVEL` (the diag child carries its own Pino level)
- [x] A failed `sdk.start()` degrades to no tracing and logs, rather than aborting server boot
- [x] A single HTTP request produces exactly **one** request/response log pair, sharing one `reqId`

---

## Directory structure

```
libs/otel/
├── src/
│   ├── logger.ts         # createLogger factory
│   ├── tracing.ts        # initTelemetry
│   ├── diag.ts           # OTel diag → Pino adapter (internal, not re-exported)
│   └── index.ts          # public surface: createLogger, initTelemetry, LoggerOptions, Logger
├── .gitignore            # step 1 of the root AGENTS.md "Creating a new lib" checklist
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
    "@opentelemetry/api": "^1.9.1",
    "@opentelemetry/sdk-node": "^0.222.0",
    "@opentelemetry/auto-instrumentations-node": "^0.80.0",
    "@opentelemetry/exporter-trace-otlp-http": "^0.222.0"
  },
  "devDependencies": {
    "@types/node": "catalog:",
    "pino-pretty": "^13.1.3",
    "tsup": "^8.5.0",
    "typescript": "^5.9.3"
  }
}
```

The `@opentelemetry/*` ranges above are what `pnpm add` resolved on 2026-09-13, recorded for reference — re-resolve rather than copy them.

**One `@opentelemetry/api` in the tree is load-bearing beyond context propagation.** `drizzle-orm` declares `@opentelemetry/api` as an _optional peer_, so making it reachable from `apps/nebula-chat-server` changes which `drizzle-orm` variant that importer resolves. If the lockfile ends up with both `drizzle-orm@x(@opentelemetry/api)(@types/pg)(pg)` and `drizzle-orm@x(@types/pg)(pg)`, `pnpm typecheck` fails with dozens of "separate declarations of a private property" errors across `@nebula-chat/db`'s boundary — two copies of the same classes. Check with `grep -n "drizzle-orm:" -A 3 pnpm-lock.yaml`; there must be exactly one variant. A stale lockfile is the usual cause, and `pnpm install --force` after the dependency edits settles it.

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

export type LoggerOptions = {
  level?: string;
  pretty?: boolean;
};

export const createLogger = (options: LoggerOptions = {}) =>
  pino({
    level: options.level ?? process.env.LOG_LEVEL ?? 'info',
    transport: options.pretty
      ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } }
      : undefined,
  });

export type Logger = ReturnType<typeof createLogger>;
```

`type` not `interface`, and a `const` arrow not a `function` declaration — both are hard rules in the root `AGENTS.md` Cross-cutting Conventions, and ESLint enforces the second via `func-style: ['error', 'expression']`. The same applies to every snippet below.

### File: `libs/otel/src/diag.ts`

OTel reports its own failures through the `diag` API, which is silent by default — so a misconfigured exporter fails invisibly. The conventional remedy, `diag.setLogger(new DiagConsoleLogger(), ...)`, writes to `console.*`: forbidden here, and it would bypass the pipeline this lib exists to build. Adapt `DiagLogger` onto Pino instead.

```ts
type DiagLevelName = 'none' | 'error' | 'warn' | 'info' | 'debug' | 'verbose' | 'all';

// Unknown or absent → ERROR, not NONE. Silence is the failure mode being fixed.
export const resolveDiagLevel = (raw?: string): DiagLogLevel => {
  const name = raw?.trim().toLowerCase();
  return name !== undefined && isDiagLevelName(name) ? DIAG_LEVELS[name] : DiagLogLevel.ERROR;
};

export const attachDiagLogger = (logger: Logger, raw?: string): void => {
  const diagLog = logger.child({ component: 'otel' });
  // error→error, warn→warn, info→info, debug→debug, verbose→trace (Pino has no verbose).
  const adapter: DiagLogger = {/* ...emit(diagLog, level, message, args) per method... */};

  diag.setLogger(adapter, {
    logLevel: resolveDiagLevel(raw),
    suppressOverrideMessage: true,
  });
};
```

Three details that are not optional:

- **`component: 'otel'`** on the child logger is what keeps SDK chatter filterable once logs are aggregated.
- **`suppressOverrideMessage: true`.** `new NodeSDK()` registers its own `DiagConsoleLogger` whenever `OTEL_LOG_LEVEL` is set (`sdk-node/build/src/sdk.js`, in the constructor), so this call is normally an override, and the API announces an override _through the logger it is about to replace_ — a raw stack trace on the console, the exact output being designed away.
- **Extra args go in a bound object, not positionally.** Pino v10 derives a log call's variadic arity from the message's literal format string, so a non-literal `string` message accepts no trailing args; `logger[level]({ args }, message)` is the form that typechecks.

`diag.ts` is internal — it is **not** re-exported from `index.ts`; tsup bundles it via the `tracing.ts` import. The public surface stays `createLogger`, `initTelemetry`, `LoggerOptions`, `Logger`.

### File: `libs/otel/src/tracing.ts`

Reads `process.env` directly and **not** the server's Zod-validated `env` — a published lib must not depend on one consumer's env schema, and importing `src/env.ts` here would pull `dotenv` and Zod into the module graph ahead of the SDK, defeating the import ordering that makes auto-instrumentation work.

```ts
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { attachDiagLogger } from './diag';
import { createLogger } from './logger';
import type { Logger } from './logger';

type InitTelemetryOptions = {
  logger?: Logger;
  diagLevel?: string;
};

let sdk: NodeSDK | null = null;

export const initTelemetry = (serviceName: string, options: InitTelemetryOptions = {}): void => {
  if (!process.env.OTEL_EXPORTER_OTLP_ENDPOINT) return;

  sdk = new NodeSDK({
    serviceName,
    traceExporter: new OTLPTraceExporter(),
    instrumentations: [getNodeAutoInstrumentations()],
  });

  // After the constructor (which installs its own console logger when
  // OTEL_LOG_LEVEL is set), before start() (so boot-time faults are captured).
  attachDiagLogger(
    options.logger ?? createLogger(),
    options.diagLevel ?? process.env.OTEL_LOG_LEVEL,
  );

  sdk.start();

  process.on('SIGTERM', () => {
    void sdk?.shutdown();
  });
};
```

`options.logger` exists so the process keeps **one** Pino instance: constructing a second one here is the two-instance split ADR-0007 removes. `InitTelemetryOptions` stays unexported — callers pass an object literal.

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

### 2. `src/server.ts` — telemetry first, one logger

```ts
// Load order here is load-bearing and invisible — do not reorder.
import { createLogger, initTelemetry } from '@nebula-chat/otel';
import { env } from '@backend/env';

const logger = createLogger({
  level: env.LOG_LEVEL,
  pretty: env.NODE_ENV === 'development',
});

initTelemetry('nebula-chat-server', { logger });

import { buildApp } from '@backend/app';

// ...existing start() body, now `await buildApp({ logger })`, with
// logger.error for startup failure
```

#### Import ordering: what "first statement" means in practice

The original criterion — `initTelemetry` as the literal first statement, above every import — cannot coexist with injecting the server's configured logger, because that logger's `level` and `pretty` come from `@backend/env`. What auto-instrumentation actually requires is that it patch its targets before they are _loaded_, so the rule as implemented is:

- `@nebula-chat/otel` and `@backend/env` may be imported above the `initTelemetry` call. `env.ts` pulls in only `dotenv` and Zod, neither of which is an instrumentation target.
- **Everything else stays below it** — `@backend/app` and its graph are what reach `http`, `pg`, and `redis`.

This works because the server compiles to CommonJS (`"module": "commonjs"` in its `tsconfig.json`, and `tsx` in dev), where an `import` becomes a `require` in source position. Under real ESM every import is hoisted above all statements and the ordering silently stops working — so if this package ever moves to ESM, `initTelemetry` has to move into its own module that is imported first.

### 3. `src/app.ts` — Fastify sources its logger from the lib

`buildApp` takes an optional logger and falls back to constructing one, which keeps its two existing argument-less call sites (`src/server.ts`, `src/scripts/generate-openapi.ts`) working:

```ts
import { createLogger } from '@nebula-chat/otel';
import type { Logger } from '@nebula-chat/otel';
import type { FastifyBaseLogger, FastifyInstance } from 'fastify';

export type BuildAppOptions = {
  logger?: Logger;
};

export const buildApp = async (options?: BuildAppOptions): Promise<FastifyInstance> => {
  // Widened to FastifyBaseLogger: Fastify infers its logger generic from this
  // value, and the concrete Pino type would specialise the returned instance
  // past the plain `FastifyInstance` this factory declares.
  const loggerInstance: FastifyBaseLogger =
    options?.logger ??
    createLogger({
      level: env.LOG_LEVEL,
      pretty: env.NODE_ENV === 'development',
    });

  const app = Fastify({
    loggerInstance,
    trustProxy: resolveTrustProxy(),
  });
  // ...
};
```

> **`loggerInstance`, not `logger`.** Earlier revisions of this ticket and ADR-0007 both wrote `Fastify({ logger: createLogger(...) })`. That does not compile against Fastify v5: `logger` accepts a boolean or a Pino _config object_, and an already-constructed instance belongs to the separate `loggerInstance` option (`fastify.d.ts` declares both). Passing an instance to `logger` makes TypeScript fall through to the http2 overload and report a dozen unrelated errors about `Http2SecureServer` and `msgPrefix`.

Fastify handles request/response logging, `reqId`, serializers, and `req.log` child loggers itself. Do not add a `pino-http` hook on top.

### 4. `src/env.ts` — declare the vars

```ts
OTEL_EXPORTER_OTLP_ENDPOINT: z.url().optional(),
OTEL_LOG_LEVEL: z.enum(['none', 'error', 'warn', 'info', 'debug', 'verbose', 'all']).default('error'),
```

Documents and validates them for the app. The lib still reads `process.env` directly, so these declarations do not gate the lib's reads — a malformed URL surfaces as an exporter error at runtime, not a boot-time Zod failure.

### 5. Repoint the remaining `src/logger.ts` consumers

There are **four**, not three: `src/cache/cache.client.ts`, `src/cache/cache.service.ts`, `src/server.ts`, and `load-env.ts` — which sits outside `src/` and so is missed by the grep below, but is inside the server's `tsconfig.json` `include` and therefore breaks `typecheck` if skipped.

Rewrite `src/logger.ts` so that instead of constructing its own standalone Pino it exports the **single shared instance** built from the lib, and have each site import that:

```ts
export const logger: Logger = createLogger({
  level: env.LOG_LEVEL,
  pretty: env.NODE_ENV === 'development',
});
```

The explicit `: Logger` annotation is required — without it `tsc` rejects the inferred type as non-portable (TS2883), because it reaches into `libs/otel`'s own `node_modules/pino`.

> **Do not give each site its own `createLogger()` call.** An earlier pass of this ticket said to, and it shipped three competing instances plus three `pino-pretty` workers in development — reintroducing the split ADR-0007 exists to remove. `src/logger.ts` stays at its old path but inverts role: it used to be a _second_ Pino competing with Fastify's, and is now the instance Fastify is built with.

`load-env.ts` is the one exception: it populates `process.env` _before_ `env.ts` parses it, so it cannot import `@backend/env` or `@backend/logger`, and uses a bare `createLogger()`. Verify:

```bash
grep -rn "@backend/logger" apps/nebula-chat-server --include=*.ts | grep -v "/dist/"
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

### 7. Local trace backend

Add a `grafana/otel-lgtm` service to `apps/nebula-chat-server/docker-compose.yml`, matching the hardening style of the existing `db` and `redis` services (loopback-bound ports, `no-new-privileges`, `cap_drop: ALL`, `restart: unless-stopped`, a healthcheck). It accepts OTLP directly on 4317/4318, so **no Collector and no collector config file are needed**, and it bundles Grafana + Tempo so the local trace UI is the same one Grafana Cloud serves in production. Publish Grafana on host port **3001** — 3000 is the server's own default. Give it a `start_period` on the healthcheck: it boots several services and is slow to become ready. The named volume carries a `# kics-scan ignore-line` comment, as the existing `db` and `redis` volumes do.

Set `OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318` in local `.env` to exercise the enabled path; leave it unset for the no-op path.

> **Why not a bare Collector.** The first version of this ticket specified `otel/opentelemetry-collector-contrib` with a `debug` exporter. A Collector routes and buffers telemetry but stores nothing and has no UI, so that setup could only print spans into a container log — enough to prove the wiring, close to useless for reading a trace. It was also built `FROM scratch` (no shell, no `curl`), so it could not carry a real healthcheck. `otel-lgtm` is a normal image and probes Grafana's `/api/health`. See ADR-0007 for when a Collector _would_ earn its place.

---

## Verification

```bash
pnpm install
pnpm --filter @nebula-chat/otel build
pnpm run lint:fix
pnpm run format
pnpm turbo run typecheck
pnpm run lint
```

> The root `package.json` has **no `typecheck` script** — bare `pnpm typecheck` fails with `ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL`. Use the Turbo form above, which also builds the lib `dist/*.d.ts` the server typechecks against.

Then, manually:

1. Boot with `OTEL_EXPORTER_OTLP_ENDPOINT` **unset** — server starts, no OTel output, no crash.
2. Boot with it pointed at `http://localhost:4318` — `GET /health` produces a trace visible in Grafana at <http://localhost:3001> (Explore → Tempo).
3. Confirm one request yields exactly **one** request/response log pair with a single `reqId`. Two pairs means a `pino-http` hook crept back in.
4. Point the endpoint at a closed port — the exporter failure appears as a Pino line carrying `"component":"otel"`, never on the console. `OTEL_LOG_LEVEL=all` widens it to all five levels (`verbose` arriving as Pino `trace`, level 10); `OTEL_LOG_LEVEL=none` silences it; an unrecognised value behaves like `error`.
