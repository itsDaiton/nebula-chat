import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  // `@worker/*` is a tsconfig path alias; Vitest resolves through Vite, so it is restated here.
  resolve: {
    alias: { '@worker': resolve(dirname, 'src') },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'lcov'],
      include: ['src/**/*.ts'],
      // Entry point, construction-only singletons and the Drizzle adapter, as in the server.
      // Mirrored into `matrix.coverage` in .github/workflows/build.yml. Change one, change the other.
      exclude: [
        'src/**/tests/**',
        'src/test/**',
        'src/worker.ts',
        'src/env.ts',
        'src/logger.ts',
        'src/db.ts',
        'src/redis.ts',
        'src/**/*Repository.ts',
      ],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});
