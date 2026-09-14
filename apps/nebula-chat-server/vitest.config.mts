import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  // `@backend/*` is a tsconfig path alias (AGENTS.md forbids relative imports),
  // and Vitest resolves through Vite, not tsc — so it has to be restated here.
  resolve: {
    alias: { '@backend': resolve(dirname, 'src') },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    setupFiles: ['src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'lcov'],
      include: ['src/**/*.ts'],
      // Entrypoints and generated artefacts. `server.ts` boots a listening process,
      // `app.ts` is plugin registration exercised end-to-end by the route tests,
      // and `src/test/` is the harness itself.
      exclude: [
        'src/**/tests/**',
        'src/server.ts',
        'src/app.ts',
        'src/logger.ts',
        'src/env.ts',
        'src/db.ts',
        'src/generated/**',
        'src/scripts/**',
        'src/test/**',
        'src/**/*.types.ts',
        // The Drizzle adapter layer. Unit-testing it means asserting that a
        // fluent query builder was called with particular expression objects —
        // implementation-coupled by construction, and it would not catch the
        // bugs that actually live here (wrong SQL). It belongs to the
        // integration-test debt ADR-0008 records; the layers above it are
        // tested with the repository mocked.
        'src/**/*.repository.ts',
      ],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});
