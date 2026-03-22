import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import pkg from './package.json';

const versionPlugin = () => ({
  name: 'version-json',
  buildStart() {
    writeFileSync(resolve(__dirname, 'public/version.json'), JSON.stringify({ version: pkg.version }));
  },
});

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react(), versionPlugin()],
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
  build: {
    outDir: 'build',
    copyPublicDir: true,
  },
});
