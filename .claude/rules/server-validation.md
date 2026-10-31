---
paths:
  - 'apps/server/src/**/*.validation.ts'
  - 'apps/server/src/**/*.routes.ts'
  - 'apps/server/src/utils/jsonResponse.ts'
  - 'apps/server/src/utils/isoDateTimeSchema.ts'
---

# Validation

Validation is handled by Fastify's native schema layer via `fastify-zod-openapi` (see
[ADR-0018](../../docs/adr/0018-fastify-zod-openapi-named-schemas-env-free-spec.md)). Define Zod schemas in the
module's `*.validation.ts` file, then reference them in the `schema:` block of the corresponding route. Use
`FastifyPluginCallbackZodOpenApi` (not `FastifyPluginCallback`) so TypeScript infers request types from the schemas.
Registering routes awaits nothing, so the plugin is a callback that ends with `done()`: an `async` one with no
`await` is Sonar's `typescript:S7503`:

```ts
// session.routes.ts
import type { FastifyPluginCallbackZodOpenApi } from 'fastify-zod-openapi';
import { errorEnvelopeSchema } from '@nebula-chat/errors';
import { sessionController } from '@server/modules/session/session.controller';
import {
  sessionResponseSchema,
  createSessionSchema,
} from '@server/modules/session/session.validation';
import { jsonResponse } from '@server/utils/jsonResponse';

const sessionRoutes: FastifyPluginCallbackZodOpenApi = (app, _options, done) => {
  app.post('/', {
    schema: {
      description: 'Create a new session with a title',
      summary: 'Create session',
      tags: ['Sessions'],
      operationId: 'createSession',
      body: createSessionSchema,
      response: {
        201: jsonResponse('Session created successfully', sessionResponseSchema),
        400: jsonResponse('Invalid request body', errorEnvelopeSchema),
        500: jsonResponse('Internal server error', errorEnvelopeSchema),
      },
    },
    handler: sessionController.create,
  });
  done();
};
```

**Rule — every response entry is `jsonResponse('description', schema)`:** `fastify-zod-openapi` reads a
response's description from the response object, not from the schema, so a bare schema (or one with
`.describe('...')`) documents as "Default Response". The description is route-contextual, so it lives in the
`response:` block, not the validation file — success and error responses alike (see the example above).

The one exception is an SSE response (`GET /api/streams/:streamId`): its 200 entry declares `text/event-stream` with a described string schema, since the body is not JSON and the client reads it with a fetch mutator, not a generated model.

**Rule — every response resource schema carries `.meta({ id })`:** declare it on the schema in the module's
`*.validation.ts`, as a plain noun with no `…Response` suffix (`Session`, `SessionPage`, `Message`).
The spec then declares it once as a named component, and Orval generates a model with that name. Without an id
the body is inlined, and Orval names it after the operation and status (`listMessages200Item`). A route hidden with
`hide: true` needs no id, since it has no place in the spec. An array of a
named schema needs no id of its own. Request bodies, params and querystrings stay unnamed.
`src/tests/app.test.ts` fails on any inline `2xx` JSON object.

```ts
export const sessionResponseSchema = z
  .object({ id: z.uuid(), title: z.string(), createdAt: isoDateTimeSchema })
  .meta({ id: 'Session' });
```

A response timestamp the handler holds as a `Date` is `isoDateTimeSchema` (`@server/utils/isoDateTimeSchema`), never `z.date().transform(...)`. The handler returns the row's `Date`, the reply holds its ISO string, and the spec shows a `date-time` string. A bare `.transform` has no output type for the spec to render.

**Rule — every route needs a `schema:` block.** Routes without one produce "Default Response" entries. Use `{ schema: { hide: true } }` to explicitly exclude infrastructure routes (e.g. `/openapi.json`) from the spec rather than leaving them undocumented.

On a request validation failure Fastify throws `FST_ERR_VALIDATION`, whose `validation` entries are
`fastify-zod-openapi`'s `RequestValidationError`s. `errors/error.handler.ts` detects them with `instanceof
RequestValidationError` and answers `400` with the `Validation` code. A reply that fails its response schema
answers `500` `Internal`. Define schemas in `*.validation.ts` using plain Zod — no registry extensions needed.
Use `.describe()` on schema fields for Swagger docs.
