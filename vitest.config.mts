import { defineConfig } from 'vitest/config';

// Root project: covers `scripts/`, which belongs to no workspace package and so
// was the one piece of first-party TypeScript with no test runner (ADR-0008).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['scripts/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'lcov'],
      include: ['scripts/**/*.ts'],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});
