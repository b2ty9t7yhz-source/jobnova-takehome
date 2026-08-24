import { cloudflare } from "@cloudflare/vite-plugin";
import { sites } from "@openai/sites-vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import hostingConfig from "./.openai/hosting.json" with { type: "json" };

const localD1DatabaseId = "00000000-0000-4000-8000-000000000000";

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
        d1_databases: hostingConfig.d1
          ? [
              {
                binding: hostingConfig.d1,
                database_name: "jobnova-safe-demo",
                database_id: localD1DatabaseId,
              },
            ]
          : [],
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
