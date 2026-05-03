import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  outDir: 'dist',
  sourcemap: true,
  target: 'es2022',
  external: [
    'langchain',
    '@langchain/core',
    '@langchain/openai',
    '@langchain/anthropic',
    'langsmith',
    'tiktoken',
    'p-limit',
  ],
});
