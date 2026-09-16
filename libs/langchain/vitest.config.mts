import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'lcov'],
      include: ['src/**/*.ts'],
      // Thin wiring with no behaviour of its own: the public surface re-export
      // and the logger type module.
      // Mirrored into `matrix.coverage` in .github/workflows/build.yml so the
      // Sonar gate measures the same denominator. Change one, change the other.
      exclude: ['src/**/tests/**', 'src/index.ts', 'src/logger.ts'],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});
