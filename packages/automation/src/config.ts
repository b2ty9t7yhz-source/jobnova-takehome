import { resolve } from "node:path";

export interface RuntimePaths {
  root: string;
  applications: string;
  demoApplications: string;
  session: string;
  browserProfile: string;
  logs: string;
  artifacts: string;
  demoSessionVault: string;
}

export function resolveRuntimePaths(cwd = process.cwd()): RuntimePaths {
  const root = resolve(cwd, process.env.JOBNOVA_RUNTIME_DIR ?? "runtime");
  return {
    root,
    applications: resolve(root, "applications.json"),
    demoApplications: resolve(root, "demo", "applications.json"),
    session: resolve(root, "sessions", "indeed.json"),
    browserProfile: resolve(root, "sessions", "indeed-chrome-profile"),
    logs: resolve(root, "logs", "workflow.jsonl"),
    artifacts: resolve(root, "artifacts"),
    demoSessionVault: resolve(root, "demo", "session-vault"),
  };
}

export function defaultHeadless(): boolean {
  return process.env.JOBNOVA_HEADLESS?.toLocaleLowerCase() === "true";
}
