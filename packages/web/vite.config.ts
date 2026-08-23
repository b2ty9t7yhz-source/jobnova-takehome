import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { sites } from "@openai/sites-vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

function sitesStaticWorker() {
  return {
    name: "jobnova-sites-static-worker",
    apply: "build" as const,
    async closeBundle() {
      const serverDirectory = resolve(process.cwd(), "dist/server");
      await mkdir(serverDirectory, { recursive: true });
      await writeFile(
        resolve(serverDirectory, "index.js"),
        [
          "export default {",
          "  async fetch(request, env) {",
          "    return env.ASSETS.fetch(request);",
          "  },",
          "};",
          "",
        ].join("\n"),
        "utf8",
      );
    },
  };
}

export default defineConfig({
  plugins: [react(), sites(), sitesStaticWorker()],
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
    setupFiles: "./src/test/setup.ts",
    css: true,
  },
});
