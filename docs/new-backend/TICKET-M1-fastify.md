# M-1 — Fastify API Layer (replaces Express)

## Ticket metadata

| Field          | Value                                                      |
| -------------- | ---------------------------------------------------------- |
| **ID**         | M-1                                                        |
| **Depends on** | Nothing — implement first                                  |
| **Blocks**     | M-6, M-7, M-8, M-9, M-10 (all app tickets require Fastify) |
| **Standalone** | Yes                                                        |
| **Scope**      | `apps/server` only                                         |

## Objective

Replace Express with Fastify as the HTTP framework. Migrate all middleware to Fastify plugins. Migrate all routes to Fastify route handlers. Set up environment validation with Zod at startup.

## Acceptance criteria

- [ ] Express and all Express-related packages are removed from `apps/server/package.json`
- [ ] Fastify and required plugins are installed
- [ ] Server starts and accepts connections
- [ ] All existing routes are reachable at the same paths
- [ ] OpenAPI spec is served at `/docs`
- [ ] Rate limiting is active on all routes
- [ ] CORS is configured
- [ ] Invalid/missing env vars cause a clear error at startup (not a runtime crash)
- [ ] `apps/server/package.json` build script does **not** run `prisma generate`

---

## Packages

### Remove from `apps/server/package.json`

```
express
@types/express
express-rate-limit
cors
@types/cors
swagger-ui-express
@types/swagger-ui-express
@prisma/adapter-pg
```

### Add to `apps/server/package.json`

```json
{
  "dependencies": {
    "fastify": "^5.4.0",
    "@fastify/cors": "^10.0.2",
    "@fastify/rate-limit": "^10.2.2",
    "@fastify/swagger": "^9.5.0",
    "@fastify/swagger-ui": "^5.2.0",
    "@fastify/sensible": "^6.0.0",
    "@fastify/under-pressure": "^9.0.0",
    "@fastify/request-context": "^6.0.0",
    "fastify-plugin": "^5.0.0"
  }
}
```

### Update build script

```json
{
  "scripts": {
    "build": "tsc && tsc-alias"
  }
}
```

Remove `prisma generate &&` from the build script.

---

## Implementation

### File: `apps/server/src/env.ts`

Create this file. Import it as the **first import** in `server.ts`.

```ts
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  OPENAI_API_KEY: z.string().min(1),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  JWT_SECRET: z.string().min(32),
});

export const env = envSchema.parse(process.env);
```

If any variable is missing or invalid, Zod throws at import time with a descriptive error before the server accepts any connections.

---

### File: `apps/server/src/server.ts`

```ts
import './env'; // must be first
import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import sensible from '@fastify/sensible';
import underPressure from '@fastify/under-pressure';
import { env } from './env';

export async function buildApp() {
  const app = Fastify({
    logger:
      env.NODE_ENV === 'development'
        ? { transport: { target: 'pino-pretty', options: { colorize: true } } }
        : true,
  });

  // Core plugins
  await app.register(sensible);

  await app.register(cors, {
    origin: env.CORS_ORIGIN,
    credentials: true,
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Nebula Chat API',
        version: '1.0.0',
        description: 'LLM chat application API',
      },
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
  });

  await app.register(underPressure, {
    maxEventLoopDelay: 1000,
    healthCheckInterval: 5000,
  });

  // Health check (Render calls this)
  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  // Domain modules (add as they are migrated)
  // await app.register(import('./modules/chat/chat.routes'), { prefix: '/api/chat' });

  return app;
}

// Entry point
const app = await buildApp();
await app.listen({ port: Number(env.PORT), host: '0.0.0.0' });
```

---

### Route migration pattern

Each Express router becomes a Fastify plugin file. Use this pattern for every route:

```ts
// apps/server/src/modules/chat/chat.routes.ts
import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

const BodySchema = z.object({
  conversationId: z.string().uuid(),
  content: z.string().min(1).max(8000),
});

const ResponseSchema = z.object({
  messageId: z.string().uuid(),
  content: z.string(),
});

const chatRoutes: FastifyPluginAsync = async (app) => {
  app.post('/', {
    schema: {
      body: zodToJsonSchema(BodySchema),
      response: {
        200: zodToJsonSchema(ResponseSchema),
      },
    },
    handler: async (req, reply) => {
      const body = BodySchema.parse(req.body);
      // call service layer
      return reply.send({ messageId: 'uuid', content: 'response' });
    },
  });
};

export default chatRoutes;
```

Register in `server.ts`:

```ts
await app.register(import('./modules/chat/chat.routes'), { prefix: '/api/chat' });
```

---

### Express → Fastify concept mapping

| Express                               | Fastify equivalent                                                       |
| ------------------------------------- | ------------------------------------------------------------------------ |
| `app.use(cors())`                     | `app.register(cors, options)`                                            |
| `app.use(express.json())`             | Built-in — no setup needed                                               |
| `app.use(rateLimit())`                | `app.register(rateLimit, options)`                                       |
| `router.get('/path', handler)`        | `app.get('/path', { schema }, handler)`                                  |
| `req.params`, `req.query`, `req.body` | Same — `req.params`, `req.query`, `req.body`                             |
| `res.json(data)`                      | `reply.send(data)`                                                       |
| `res.status(404).json(...)`           | `reply.status(404).send(...)`                                            |
| `next(error)`                         | `throw error` or `reply.internalServerError()` (via `@fastify/sensible`) |
| `app.use('/prefix', router)`          | `app.register(plugin, { prefix: '/prefix' })`                            |

---

## Notes for subsequent tickets

- M-6 (Auth): Add `@fastify/jwt` as a plugin registered in `buildApp()`
- M-7 (Queues): Add BullMQ board as a plugin registered in `buildApp()`
- M-8 (Real-time): Add `@fastify/websocket` as a plugin registered in `buildApp()`
- All plugins that need to share state (db client, redis client) should use `fastify-plugin` to break encapsulation — see M-2 for the pattern
