import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  build: {
    outDir: 'build',
    copyPublicDir: true,
  },
});
