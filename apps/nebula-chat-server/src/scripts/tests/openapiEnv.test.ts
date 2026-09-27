import { describe, it, expect } from 'vitest';
import { applyOpenApiEnvFallbacks, missingOpenApiEnv } from '@backend/scripts/openapiEnv';

const complete = {
  OPENAI_API_KEY: 'sk-placeholder',
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
  REDIS_URL: 'redis://localhost:6379',
  BETTER_AUTH_SECRET: 'placeholder',
  BETTER_AUTH_URL: 'http://localhost:3000',
};

describe('applyOpenApiEnvFallbacks', () => {
  it('fills each unset var from its OPENAPI_-prefixed stand-in', () => {
    const env: NodeJS.ProcessEnv = Object.fromEntries(
      Object.entries(complete).map(([key, value]) => [`OPENAPI_${key}`, value]),
    );

    applyOpenApiEnvFallbacks(env);

    expect(env).toMatchObject(complete);
    expect(missingOpenApiEnv(env)).toEqual([]);
  });

  it('keeps a var that is already set over its stand-in', () => {
    const env: NodeJS.ProcessEnv = {
      DATABASE_URL: 'postgresql://real@db/app',
      OPENAPI_DATABASE_URL: 'postgresql://placeholder@localhost/db',
    };

    applyOpenApiEnvFallbacks(env);

    expect(env.DATABASE_URL).toBe('postgresql://real@db/app');
  });

  it('maps the Anthropic key stand-in on its own', () => {
    const env: NodeJS.ProcessEnv = { OPENAPI_ANTHROPIC_API_KEY: 'sk-ant-placeholder' };

    applyOpenApiEnvFallbacks(env);

    expect(env.ANTHROPIC_API_KEY).toBe('sk-ant-placeholder');
    expect(env.OPENAI_API_KEY).toBeUndefined();
  });
});

describe('missingOpenApiEnv', () => {
  it('reports nothing when every var env.ts requires is set', () => {
    expect(missingOpenApiEnv({ ...complete })).toEqual([]);
  });

  it('accepts either provider key', () => {
    const env = { ...complete, OPENAI_API_KEY: undefined, ANTHROPIC_API_KEY: 'sk-ant' };

    expect(missingOpenApiEnv(env)).toEqual([]);
  });

  it('reports every missing var, provider keys as one entry', () => {
    expect(missingOpenApiEnv({})).toEqual([
      'OPENAI_API_KEY or ANTHROPIC_API_KEY',
      'DATABASE_URL',
      'REDIS_URL',
      'BETTER_AUTH_SECRET',
      'BETTER_AUTH_URL',
    ]);
  });

  it('treats an empty string as missing', () => {
    expect(missingOpenApiEnv({ ...complete, REDIS_URL: '' })).toEqual(['REDIS_URL']);
  });
});
