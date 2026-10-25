import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import pkg from './package.json';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const versionPlugin = () => ({
  name: 'version-json',
  buildStart() {
    writeFileSync(
      resolve(__dirname, 'public/version.json'),
      JSON.stringify({ version: pkg.version }),
    );
  },
});

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  // The router plugin goes before react(): it writes src/routeTree.gen.ts and splits each route's component.
  plugins: [
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    versionPlugin(),
  ],
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
  build: {
    outDir: 'build',
    copyPublicDir: true,
  },
});
