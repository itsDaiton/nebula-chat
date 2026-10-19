import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  // `@cli/*` is a tsconfig path alias; Vitest resolves through Vite, so it is restated here.
  resolve: {
    alias: { '@cli': resolve(dirname, 'src') },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    setupFiles: ['src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'lcov'],
      include: ['src/**/*.ts'],
      // `bin.ts` only wires real process deps into `run`, which the tests drive directly.
      // Mirrored into `matrix.coverage` in .github/workflows/build.yml. Change one, change the other.
      exclude: ['src/**/tests/**', 'src/test/**', 'src/api/generated/**', 'src/bin.ts'],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});
