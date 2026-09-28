import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  outDir: 'dist',
  sourcemap: true,
  // Keep tsup's names (index.js CJS, index.mjs ESM) that the exports map points at.
  fixedExtension: false,
  target: 'es2022',
  deps: {
    neverBundle: [
      'pino',
      'pino-pretty',
      '@opentelemetry/api',
      '@opentelemetry/sdk-node',
      '@opentelemetry/auto-instrumentations-node',
      '@opentelemetry/exporter-trace-otlp-http',
    ],
  },
});
