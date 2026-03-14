import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { createRequire } from 'module';
import type { Plugin } from 'vite';

const require = createRequire(import.meta.url);

function versionJsonPlugin(): Plugin {
  const { version } = require('./package.json') as { version: string };
  const content = JSON.stringify({ version }, null, 2) + '\n';
  return {
    name: 'version-json',
    configureServer(server) {
      server.middlewares.use('/version.json', (_req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.end(content);
      });
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: content });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react(), versionJsonPlugin()],
  resolve: {
    tsconfigPaths: true,
  },
  build: {
    outDir: 'build',
    copyPublicDir: true,
  },
});
