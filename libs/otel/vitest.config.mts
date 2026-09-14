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
      // OpenTelemetry NodeSDK and `index.ts` re-exports; neither is assertable
      // without standing up a live OTLP collector, which this ticket excludes.
      exclude: ['src/**/tests/**', 'src/index.ts', 'src/tracing.ts'],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});
