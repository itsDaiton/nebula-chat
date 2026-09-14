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
      // ADR-0008: Chakra theme tokens and the Orval-generated API client have no
      // behaviour of their own; `main.tsx` is the bootstrap entrypoint.
      exclude: [
        'src/main.tsx',
        'src/vite-env.d.ts',
        'src/theme/**',
        'src/libs/api/generated/**',
        'src/test/**',
        // Tests and their local helpers live in `tests/` folders next to the
        // code under test; neither is product code.
        'src/**/tests/**',
        'src/**/*.types.ts',
        'src/**/types/**',
        // ADR-0008: style declarations and library wiring, with no behaviour to
        // assert on. `prose.tsx` is a Chakra style recipe, `scrollbar.ts` a style
        // object, and the provider/toaster/code-block modules configure Chakra.
        'src/shared/components/ui/prose.tsx',
        'src/shared/components/ui/provider.tsx',
        'src/shared/components/ui/toaster.tsx',
        'src/shared/components/ui/code-block-adapter.ts',
        'src/shared/components/scrollbar.ts',
        'src/resources.ts',
      ],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});
