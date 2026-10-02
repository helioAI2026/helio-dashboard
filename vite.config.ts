import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

export default defineConfig(({ mode }) => {
  // Em dev híbrido, /api/* que o MSW deixa passar vai para o CloudFront (mesma API da produção).
  const proxyTarget = loadEnv(mode, process.cwd(), "").VITE_API_PROXY_TARGET;

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    build: {
      chunkSizeWarningLimit: 900,
    },
    server: proxyTarget
      ? { proxy: { "/api": { target: proxyTarget, changeOrigin: true } } }
      : undefined,
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: ["./src/test/setup.ts"],
      css: true,
    },
  };
});
