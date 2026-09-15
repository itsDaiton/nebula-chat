import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'lcov'],
      include: ['src/**/*.ts'],
      // ADR-0008: `schema.ts` is Drizzle table declarations with no behaviour to
      // assert on, and the client/migration entrypoints require a live Postgres,
      // which this ticket excludes. `env.ts` carries the only real logic here.
      // Mirrored into `matrix.coverage` in .github/workflows/build.yml so the
      // Sonar gate measures the same denominator. Change one, change the other.
      exclude: [
        'src/**/tests/**',
        'src/index.ts',
        'src/schema.ts',
        'src/client.ts',
        'src/migrate.ts',
        'src/baseline.ts',
      ],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});
