import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'lcov'],
      include: ['src/**/*.ts'],
      // ADR-0008: SDK wiring, not behaviour. `tracing.ts` constructs and starts the
      // OpenTelemetry NodeSDK and `index.ts` re-exports. What tracing.ts promises
      // a log reader (trace ids with no endpoint, no exporter built, a warn on a
      // failed start) is asserted in tracing.test.ts; its export branch needs a
      // live OTLP collector, which unit tests exclude.
      // Mirrored into `matrix.coverage` in .github/workflows/build.yml so the
      // Sonar gate measures the same denominator. Change one, change the other.
      exclude: ['src/**/tests/**', 'src/index.ts', 'src/tracing.ts'],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});
