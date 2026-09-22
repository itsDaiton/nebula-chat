import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'lcov'],
      include: ['src/**/*.ts'],
      // `index.ts` re-exports only. `auth.ts` is pure better-auth SDK wiring: it
      // builds the configured instance and cannot be asserted without standing up
      // the library (ADR-0008 keeps this lib unit-only, no testcontainers). The
      // testable behaviour — the conversation claim (ADR-0010 §2) — is extracted
      // into `claim.ts`, which carries the gate. Mirrored into `matrix.coverage`
      // in .github/workflows/build.yml — change one, change the other.
      exclude: ['src/**/tests/**', 'src/index.ts', 'src/auth.ts'],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});
