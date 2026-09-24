import { describe, expect, it } from 'vitest';
import { pruneUnreferencedSchemas } from '@backend/utils/pruneUnreferencedSchemas';

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });

describe('pruneUnreferencedSchemas', () => {
  it('keeps schemas a path references, and the schemas they reference', () => {
    const document = {
      paths: { '/x': { get: { responses: { 400: { schema: ref('Envelope') } } } } },
      components: { schemas: { Envelope: { oneOf: [ref('Code')] }, Code: { type: 'string' } } },
    };

    expect(pruneUnreferencedSchemas(document)).toEqual(document);
  });

  it('drops an unreferenced schema and everything only it referenced', () => {
    const document = {
      paths: { '/x': { get: { responses: { 400: { schema: ref('Envelope') } } } } },
      components: {
        schemas: {
          Envelope: { oneOf: [ref('Code')] },
          Code: { type: 'string' },
          EnvelopeInput: { oneOf: [ref('CodeInput')] },
          CodeInput: { type: 'string' },
        },
      },
    };

    expect(Object.keys(pruneUnreferencedSchemas(document).components.schemas)).toEqual([
      'Envelope',
      'Code',
    ]);
  });

  it('leaves the rest of the document untouched', () => {
    const document = {
      openapi: '3.0.0',
      components: { securitySchemes: { cookieAuth: { type: 'apiKey' } }, schemas: {} },
    };

    expect(pruneUnreferencedSchemas(document)).toEqual(document);
  });

  it('passes through a document with no component schemas', () => {
    const document = { openapi: '3.0.0' };

    expect(pruneUnreferencedSchemas(document)).toBe(document);
  });
});
