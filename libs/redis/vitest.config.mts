import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'lcov'],
      include: ['src/**/*.ts'],
      // ADR-0009: `index.ts` re-exports only, `connection.ts` and `factory.ts`
      // construct live ioredis instances that cannot be asserted without a real
      // server (this ticket is unit-only per ADR-0008). Behaviour lives in
      // `cache.ts` and `keys.ts`, which carry the gate. Mirrored into
      // `matrix.coverage` in .github/workflows/build.yml — change one, change the
      // other.
      exclude: [
        'src/**/tests/**',
        'src/index.ts',
        'src/connection.ts',
        'src/factory.ts',
        'src/metrics.ts',
      ],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});
