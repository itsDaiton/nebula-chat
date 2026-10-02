import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createTestApp } from '@backend/test/app';

// No database or auth instance: the document is built from the route schemas alone.
vi.mock('@backend/db', () => ({ db: {}, closeDb: vi.fn(async () => undefined) }));
vi.mock('@backend/auth', () => ({
  auth: { api: { getSession: vi.fn() }, handler: vi.fn() },
}));

type SchemaObject = {
  $ref?: string;
  type?: string | string[];
  properties?: Record<string, unknown>;
  items?: SchemaObject;
};

type ResponseObject = { content?: Record<string, { schema?: SchemaObject }> };

type OperationObject = {
  tags?: string[];
  security?: Record<string, string[]>[];
  responses?: Record<string, ResponseObject>;
};

type OpenApiDocument = {
  openapi: string;
  servers: { url: string }[];
  paths: Record<string, Record<string, OperationObject>>;
  components: { schemas: Record<string, unknown>; securitySchemes: Record<string, unknown> };
};

const isInlineObject = (schema: SchemaObject | undefined) =>
  schema?.$ref === undefined && schema?.properties !== undefined;

let app: FastifyInstance;
let document: OpenApiDocument;

beforeAll(async () => {
  app = await createTestApp();
  document = app.swagger() as unknown as OpenApiDocument;
});

afterAll(async () => {
  await app.close();
});

describe('OpenAPI document', () => {
  it('is OpenAPI 3.1 served from the same origin', () => {
    expect(document.openapi).toBe('3.1.0');
    expect(document.servers).toEqual([{ url: '/' }]);
  });

  // An inline 2xx body is what Orval names after its operation and status
  // (`listMessages200Item`). Every response resource carries `.meta({ id })`.
  it('gives every 2xx JSON response a named schema, never an inline object', () => {
    const inline = Object.entries(document.paths).flatMap(([path, operations]) =>
      Object.entries(operations).flatMap(([method, operation]) =>
        Object.entries(operation.responses ?? {})
          .filter(([status]) => status.startsWith('2'))
          .filter(([, response]) => {
            const schema = response.content?.['application/json']?.schema;
            return isInlineObject(schema) || isInlineObject(schema?.items);
          })
          .map(([status]) => `${method.toUpperCase()} ${path} ${status}`),
      ),
    );

    expect(inline).toEqual([]);
  });

  it('declares each response resource once, with no input or output twin', () => {
    expect(Object.keys(document.components.schemas).sort()).toEqual([
      'ApiRoot',
      'Conversation',
      'ConversationPage',
      'ErrorCode',
      'ErrorEnvelope',
      'Health',
      'LogLevelChange',
      'Message',
    ]);
  });

  // Tagged so orval.config.ts can leave it out of the browser client.
  it('documents the operator route under its own tag, behind the operator token', () => {
    const operation = document.paths['/api/internal/log-level']?.['post'];

    expect(operation?.tags).toEqual(['Operator']);
    expect(operation?.security).toEqual([{ operatorToken: [] }]);
    expect(document.components.securitySchemes['operatorToken']).toEqual({
      type: 'http',
      scheme: 'bearer',
    });
  });

  it('renders a response timestamp as a date-time string', () => {
    expect(document.components.schemas['Conversation']).toMatchObject({
      properties: { createdAt: { type: 'string', format: 'date-time' } },
    });
  });
});

describe('app routes', () => {
  it('reports liveness on /health', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });

    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('ok');
  });

  it('serves a welcome message at the root', async () => {
    const res = await app.inject({ method: 'GET', url: '/' });

    expect(res.statusCode).toBe(200);
    expect(res.json().message).toContain('Nebula Chat');
  });

  it('serves the generated OpenAPI document', async () => {
    const res = await app.inject({ method: 'GET', url: '/openapi.json' });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(JSON.parse(JSON.stringify(document)));
  });

  it('responds 404 for an unknown route', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/nope' });

    expect(res.statusCode).toBe(404);
  });
});
