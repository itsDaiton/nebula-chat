# M-9 — Testing Stack

## Ticket metadata

| Field          | Value                                                       |
| -------------- | ----------------------------------------------------------- |
| **ID**         | M-9                                                         |
| **Scope**      | `apps/server` + test infrastructure                         |
| **Depends on** | M-1 (Fastify — tests run against the Fastify app)           |
| **Blocks**     | Nothing                                                     |
| **Standalone** | Partial — infrastructure independent, tests are per-feature |

## Objective

Set up Vitest for unit tests, Supertest for integration tests against the real Fastify app, testcontainers for a real Postgres container in CI, and msw for mocking external HTTP calls.

## Acceptance criteria

- [ ] `pnpm backend test` runs unit tests with Vitest
- [ ] `pnpm backend test:integration` runs integration tests with a real Postgres container
- [ ] `pnpm backend test:coverage` generates a coverage report
- [ ] `pnpm backend test:load` runs autocannon against the local server
- [ ] An example integration test exists that hits a real route with Supertest
- [ ] An example msw mock exists that intercepts OpenAI API calls
- [ ] CI passes (CI-1 calls `pnpm backend test`)

## Packages to add to `apps/server/package.json` devDependencies

```json
{
  "devDependencies": {
    "vitest": "^3.0.0",
    "@vitest/coverage-v8": "^3.0.0",
    "supertest": "^7.0.0",
    "@types/supertest": "^6.0.0",
    "msw": "^2.0.0",
    "testcontainers": "^10.0.0",
    "@testcontainers/postgresql": "^10.0.0",
    "autocannon": "^8.0.0",
    "pino-pretty": "^13.0.0"
  }
}
```

Add scripts to `apps/server/package.json`:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:integration": "vitest run --config vitest.integration.config.ts",
    "test:load": "autocannon -c 100 -d 10 http://localhost:3000/health"
  }
}
```

## Implementation

### File: `apps/server/vitest.config.ts`

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      exclude: ['src/scripts/', 'src/workers/'],
    },
    include: ['src/**/*.test.ts', 'tests/unit/**/*.test.ts'],
  },
});
```

### File: `apps/server/vitest.integration.config.ts`

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    testTimeout: 60_000,
    hookTimeout: 60_000,
    pool: 'forks', // testcontainers requires forked processes
  },
});
```

### Example integration test

```ts
// tests/integration/health.test.ts
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import supertest from 'supertest';
import { buildApp } from '../../src/server';

let app: Awaited<ReturnType<typeof buildApp>>;
let container: Awaited<ReturnType<PostgreSqlContainer['start']>>;

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:16-alpine').start();
  process.env.DATABASE_URL = container.getConnectionUri();
  process.env.REDIS_URL = 'redis://localhost:6379';
  process.env.JWT_SECRET = 'test-secret-at-least-32-characters-long';
  process.env.OPENAI_API_KEY = 'sk-test';
  process.env.CORS_ORIGIN = 'http://localhost:5173';

  app = await buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
  await container.stop();
});

test('GET /health returns 200', async () => {
  const res = await supertest(app.server).get('/health');
  expect(res.status).toBe(200);
  expect(res.body).toMatchObject({ status: 'ok' });
});

test('POST /api/chat returns 401 without token', async () => {
  const res = await supertest(app.server).post('/api/chat').send({ content: 'hello' });
  expect(res.status).toBe(401);
});
```

### Example msw mock for OpenAI

```ts
// tests/mocks/openai.mock.ts
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

export const openaiMock = setupServer(
  http.post('https://api.openai.com/v1/chat/completions', () => {
    return HttpResponse.json({
      id: 'chatcmpl-test',
      object: 'chat.completion',
      choices: [
        {
          index: 0,
          message: { role: 'assistant', content: 'Mocked LLM response' },
          finish_reason: 'stop',
        },
      ],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    });
  }),
);

// In test files that need LLM mocking:
// beforeAll(() => openaiMock.listen({ onUnhandledRequest: 'error' }));
// afterEach(() => openaiMock.resetHandlers());
// afterAll(() => openaiMock.close());
```

---

---
