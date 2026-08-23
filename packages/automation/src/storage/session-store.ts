import { randomUUID } from "node:crypto";
import { chmod, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { BrowserContext, BrowserContextOptions } from "playwright";

export type InlineStorageState = Exclude<NonNullable<BrowserContextOptions["storageState"]>, string>;

export interface BrowserSessionStore {
  load(): Promise<InlineStorageState | undefined>;
  save(context: BrowserContext): Promise<void>;
}

export class SessionStore implements BrowserSessionStore {
  constructor(private readonly filePath: string) {}

  async load(): Promise<InlineStorageState | undefined> {
    try {
      const parsed: unknown = JSON.parse(await readFile(this.filePath, "utf8"));
      return parseStorageState(parsed);
    } catch (error) {
      if (isNodeError(error) && error.code === "ENOENT") return undefined;
      throw error;
    }
  }

  async save(context: BrowserContext): Promise<void> {
    const state = await context.storageState();
    const directory = dirname(this.filePath);
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const temporaryPath = `${this.filePath}.${process.pid}.${randomUUID()}.tmp`;
    await writeFile(temporaryPath, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
    await chmod(temporaryPath, 0o600);
    await rename(temporaryPath, this.filePath);
  }
}

export function parseStorageState(value: unknown): InlineStorageState {
  if (!value || typeof value !== "object") {
    throw new Error("Saved browser session has an invalid format.");
  }
  const candidate = value as { cookies?: unknown; origins?: unknown };
  if (!Array.isArray(candidate.cookies) || !Array.isArray(candidate.origins)) {
    throw new Error("Saved browser session has an invalid format.");
  }
  return candidate as InlineStorageState;
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
