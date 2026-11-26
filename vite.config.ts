// Configuration Vite + Vitest de la vitrine SPAWT.
// Vite 5, plugin React, jsdom pour les tests de composants.
// Métadonnées et contenu public prérendus au build, puis servis par nginx.
import { defineConfig } from "vitest/config";
import { existsSync, realpathSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnv, type Connect, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { pilotDelivery } from "./scripts/pilot-delivery";
import pinnedRelease from "./scripts/android-release.json";

// nginx copies the verified APK during the Docker build. Clean Vite checkouts
// can still deliver the exact same release before their local mirror is populated.
function androidDownloadMirror(): Plugin {
  function downloads(root: string): Connect.NextHandleFunction {
    return (request, response, next) => {
      const path = request.url?.split("?")[0];
      if (path === "/spawt-latest.apk" || path === "/spawt-latest.apk.sha256") {
        response.writeHead(307, { Location: "/downloads/" + pinnedRelease.fileName + (path.endsWith(".sha256") ? ".sha256" : ""), "Cache-Control": "no-store" });
        response.end();
        return;
      }
      if (path === "/" + pinnedRelease.fileName + ".sha256" && existsSync(resolve(root, "downloads", pinnedRelease.fileName + ".sha256"))) return next();
      if (path !== "/" + pinnedRelease.fileName) { response.statusCode = 404; response.end(); return; }
      if (existsSync(resolve(root, "downloads", pinnedRelease.fileName))) {
        response.setHeader("Content-Type", "application/vnd.android.package-archive");
        response.setHeader("Accept-Ranges", "bytes");
        response.setHeader("Content-Disposition", 'attachment; filename="' + pinnedRelease.fileName + '"');
        next();
      } else {
        response.writeHead(307, { Location: pinnedRelease.url, "Cache-Control": "no-store" });
        response.end();
      }
    };
  }
  return {
    name: "android-download-mirror",
    configureServer(server) { server.middlewares.use("/downloads", downloads(server.config.publicDir)); },
    configurePreviewServer(server) { server.middlewares.use("/downloads", downloads(resolve(server.config.root, server.config.build.outDir))); },
  };
}

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const local = command === "serve" && mode === "development";
  const apk = local && env.VITE_PILOT_LOCAL_APK === "1" && env.PILOT_ANDROID_ARTIFACT_DIR;
  return {
    root: mode === "test" ? realpathSync(process.cwd()) : undefined,
    plugins: [react(), androidDownloadMirror(), ...(apk ? [pilotDelivery(apk)] : [])],
    server: {
      port: 5174, strictPort: true,
      fs: mode === "test" ? { allow: [realpathSync(process.cwd()), process.cwd()] } : undefined,
      proxy: local && env.VITE_PILOT_LOCAL_API === "1" ? {
        "^/pilot-api/rpc/": {
          target: "http://127.0.0.1:55487",
          rewrite: path => path.replace(/^\/pilot-api(?=\/)/, ""),
          configure(proxy) {
            proxy.on("proxyReq", request => {
              request.removeHeader("apikey");
              request.removeHeader("authorization");
            });
          },
        },
      } : undefined,
    },
    build: { outDir: "dist", sourcemap: true },
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: ["./src/test/setup.ts"],
      css: false,
    },
  };
});
