import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'lcov'],
      include: ['src/**/*.ts'],
      // ADR-0008: `index.ts` re-exports only. Mirrored into `matrix.coverage` in
      // .github/workflows/build.yml — change one, change the other.
      exclude: ['src/**/tests/**', 'src/index.ts'],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});
