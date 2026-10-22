// Configuration Vite + Vitest de la vitrine SPAWT.
// Vite 5, plugin React, jsdom pour les tests de composants.
// Pas de SSR — SPA statique servie par nginx (cf. Dockerfile).
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 5174, strictPort: true },
  build: { outDir: "dist", sourcemap: true },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    css: false,
  },
});
