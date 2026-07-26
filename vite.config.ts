// Configuration Vite + Vitest du portail SPAWT.
// Alignée sur spawt-admin (mêmes majeures) : Vite 5, plugin React, jsdom pour
// les tests de composants. Pas de SSR — SPA servie par nginx (cf. Dockerfile).
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
    // Backend factice injecté dans import.meta.env pour des URLs/headers
    // assertables dans les tests (aucun appel réseau réel : fetch est stubbé).
    env: {
      VITE_SUPABASE_URL: "https://test.supabase.co",
      VITE_SUPABASE_ANON_KEY: "cle-anon-test",
    },
  },
});
