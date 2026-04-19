# M-5 — `@nebula-chat/otel` (Pino + OpenTelemetry)

## Ticket metadata

| Field | Value |
|-------|-------|
| **ID** | M-5 |
| **Package** | `libs/otel` → published as `@nebula-chat/otel` |
| **Depends on** | Nothing — fully independent lib ticket |
| **Blocks** | Nothing |
| **Standalone** | Yes |

## Objective

Create `libs/otel` providing a Pino logger factory and OpenTelemetry SDK initialisation. `apps/server` calls `initTelemetry()` as the very first statement in `server.ts` before any other imports.

## Acceptance criteria

- [ ] `libs/otel/` exists with correct `package.json`
- [ ] `createLogger(options)` returns a configured Pino logger
- [ ] `initTelemetry(serviceName)` initialises the OTel SDK when `OTEL_EXPORTER_OTLP_ENDPOINT` is set
- [ ] `initTelemetry()` is a no-op when the env var is absent (no crash)
- [ ] A Fastify plugin registers `pino-http` request logging
- [ ] `apps/server` imports and calls `initTelemetry` before any other import

---

## Implementation

### File: `libs/otel/package.json`

```json
{
  "name": "@nebula-chat/otel",
  "version": "0.1.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "publishConfig": {
    "registry": "https://npm.pkg.github.com",
    "access": "restricted"
  },
  "scripts": { "build": "tsc" },
  "dependencies": {
    "pino": "^9.7.0",
    "pino-http": "^10.5.0",
    "@opentelemetry/api": "^1.9.0",
    "@opentelemetry/sdk-node": "^0.57.0",
    "@opentelemetry/auto-instrumentations-node": "^0.58.0",
    "@opentelemetry/exporter-trace-otlp-http": "^0.57.0",
    "fastify-plugin": "^5.0.0"
  },
  "devDependencies": {
    "@types/node": "^25.5.0",
    "fastify": "^5.4.0",
    "typescript": "^5.9.3"
  }
}
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

  process.on('SIGTERM', async () => {
    await sdk?.shutdown();
  });
}
```

### File: `libs/otel/src/fastify-logger.plugin.ts`

```ts
import fp from 'fastify-plugin';
import pinoHttp from 'pino-http';
import { createLogger } from './logger';

export default fp(async (app) => {
  const logger = createLogger({
    pretty: process.env.NODE_ENV === 'development',
  });
  app.addHook('onRequest', pinoHttp({ logger }) as any);
});
```

### File: `libs/otel/src/index.ts`

```ts
export { createLogger } from './logger';
export type { LoggerOptions, Logger } from './logger';
export { initTelemetry } from './tracing';
export { default as fastifyLoggerPlugin } from './fastify-logger.plugin';
```

### Usage in `apps/server/src/server.ts`

```ts
// MUST be the first two lines — before any other imports
import { initTelemetry } from '@nebula-chat/otel';
initTelemetry('nebula-chat-server');

// All other imports below
import Fastify from 'fastify';
import { fastifyLoggerPlugin } from '@nebula-chat/otel';

// Inside buildApp():
await app.register(fastifyLoggerPlugin);
```

---
---

