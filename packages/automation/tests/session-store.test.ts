import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { BrowserContext } from "playwright";
import { afterEach, describe, expect, it } from "vitest";
import { SessionStore } from "../src/storage/session-store.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true })));
});

describe("session store", () => {
  it("round-trips storage state using an owner-only file", async () => {
    const directory = await mkdtemp(join(tmpdir(), "jobnova-session-"));
    temporaryDirectories.push(directory);
    const path = join(directory, "session.json");
    const state = {
      cookies: [{ name: "session", value: "redacted-test-value", domain: ".indeed.com", path: "/", expires: -1, httpOnly: true, secure: true, sameSite: "Lax" as const }],
      origins: [],
    };
    const context = { storageState: async () => state } as unknown as BrowserContext;
    const store = new SessionStore(path);

    await store.save(context);

    expect(await store.load()).toEqual(state);
    expect((await stat(path)).mode & 0o777).toBe(0o600);
  });

  it("rejects malformed persisted state", async () => {
    const directory = await mkdtemp(join(tmpdir(), "jobnova-session-"));
    temporaryDirectories.push(directory);
    const path = join(directory, "session.json");
    await writeFile(path, await readFile(new URL("../data/profile.example.json", import.meta.url), "utf8"));

    await expect(new SessionStore(path).load()).rejects.toThrow("invalid format");
  });
});
