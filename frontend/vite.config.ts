import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'child_process';
import type { Plugin } from 'vite';

function resolveVersion(): string {
  try {
    return execSync('git describe --exact-match --tags HEAD', { stdio: 'pipe' })
      .toString()
      .trim()
      .replace(/^v/, '');
  } catch {
    try {
      return execSync('git rev-parse --short HEAD', { stdio: 'pipe' }).toString().trim();
    } catch {
      return 'unknown';
    }
  }
}

function versionJsonPlugin(): Plugin {
  const content = JSON.stringify({ version: resolveVersion() }, null, 2) + '\n';
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
