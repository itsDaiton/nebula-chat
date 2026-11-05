import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const dirname = fileURLToPath(new URL('.', import.meta.url));

// Deliberately standalone rather than merged with vite.config.ts: that config
// registers `versionPlugin`, which writes public/version.json on buildStart and
// has no business running during a test.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': resolve(dirname, 'src') },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      // ADR-0008: the Orval-generated API client has no behaviour of its own;
      // `main.tsx` is the bootstrap entrypoint, and `RouterDevtools` loads only
      // under `vite dev`.
      // Mirrored into `matrix.coverage` in .github/workflows/build.yml so the
      // Sonar gate measures the same denominator. Change one, change the other.
      exclude: [
        'src/main.tsx',
        'src/libs/api/generated/**',
        // TanStack Router's generated route tree (the router plugin's output).
        'src/routeTree.gen.ts',
        'src/test/**',
        // Tests and their local helpers live in `tests/` folders next to the
        // code under test; neither is product code.
        'src/**/tests/**',
        'src/**/types/**',
        // ADR-0008: UI strings, no behaviour to assert on.
        'src/resources.ts',
        'src/routing/RouterDevtools.tsx',
      ],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});
