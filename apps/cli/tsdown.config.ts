import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/bin.ts'],
  format: ['esm'],
  clean: true,
  outDir: 'dist',
  sourcemap: true,
  platform: 'node',
  target: 'node26',
  // dist/bin.js, the path package.json's `bin` points at.
  fixedExtension: false,
});
