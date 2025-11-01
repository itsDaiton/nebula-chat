import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { resolve } from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  build: {
    outDir: "build",
    copyPublicDir: false,
  },
  resolve: {
    alias: {
      "@frontend": resolve(__dirname, "src"),
    },
  },
});
