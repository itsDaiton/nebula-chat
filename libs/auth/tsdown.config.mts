import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  outDir: 'dist',
  sourcemap: true,
  // Emit index.js (CJS) and index.mjs (ESM), the names the exports map points at.
  fixedExtension: false,
  target: 'es2022',
  deps: {
    neverBundle: [
      'better-auth',
      'drizzle-orm',
      '@nebula-chat/db',
      '@nebula-chat/redis',
      '@nebula-chat/otel',
      'resend',
      'react',
      'react-dom',
      'react-email',
    ],
  },
});
