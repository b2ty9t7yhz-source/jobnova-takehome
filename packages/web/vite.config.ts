import { cloudflare } from "@cloudflare/vite-plugin";
import { sites } from "@openai/sites-vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    react(),
    sites(),
    cloudflare({
      viteEnvironment: {
        name: "server",
      },
      config: {
        main: "./worker/index.ts",
        compatibility_date: "2026-08-23",
        assets: {
          binding: "ASSETS",
          not_found_handling: "single-page-application",
        },
      },
    }),
  ],
  server: {
    host: "127.0.0.1",
    port: 4173,
  },
  preview: {
    host: "127.0.0.1",
    port: 4173,
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    setupFiles: "./src/test/setup.ts",
    css: true,
  },
});
