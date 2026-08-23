import { randomBytes } from "node:crypto";
import { readFile, rm } from "node:fs/promises";
import type { BrowserContext } from "playwright";
import { EncryptedSessionVault } from "../session-vault/service.js";
import { EncryptedRemoteSessionStore } from "../storage/remote-session-store.js";

const demoUserId = "reviewer-demo";
const demoProvider = "indeed";
const demoToken = "synthetic-demo-token";
const syntheticCookieValue = "synthetic-cookie-never-sent-in-plaintext";

export interface SessionVaultDemoResult {
  restored: boolean;
  plaintextAbsentFromVault: boolean;
  storedEnvelopeBytes: number;
  vaultPath: string;
}

export async function runSessionVaultDemo(rootDirectory: string): Promise<SessionVaultDemoResult> {
  await rm(rootDirectory, { recursive: true, force: true });
  const vault = new EncryptedSessionVault({
    rootDirectory,
    tenantTokens: { [demoUserId]: demoToken },
  });
  const state = {
    cookies: [
      {
        name: "session",
        value: syntheticCookieValue,
        domain: ".indeed.test",
        path: "/",
        expires: -1,
        httpOnly: true,
        secure: true,
        sameSite: "Lax" as const,
      },
    ],
    origins: [],
  };
  const store = new EncryptedRemoteSessionStore({
    endpoint: `https://session-vault.demo/v1/users/${demoUserId}/${demoProvider}`,
    token: demoToken,
    encryptionKey: randomBytes(32),
    fetchImpl: createVaultFetch(vault),
  });
  const context = { storageState: async () => state } as unknown as BrowserContext;

  await store.save(context);
  const restored = await store.load();
  const vaultPath = vault.sessionPath(demoUserId, demoProvider);
  const storedEnvelope = await readFile(vaultPath, "utf8");

  return {
    restored: JSON.stringify(restored) === JSON.stringify(state),
    plaintextAbsentFromVault: !storedEnvelope.includes(syntheticCookieValue),
    storedEnvelopeBytes: Buffer.byteLength(storedEnvelope, "utf8"),
    vaultPath,
  };
}

function createVaultFetch(vault: EncryptedSessionVault): typeof fetch {
  return async (input, init) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input : input.url);
    const headers = new Headers(init?.headers);
    const authorization = headers.get("authorization");
    const result = await vault.handle({
      method: init?.method ?? "GET",
      pathname: url.pathname,
      ...(authorization ? { authorization } : {}),
      ...(typeof init?.body === "string" ? { body: init.body } : {}),
    });
    return new Response(result.body, { status: result.status, headers: result.headers });
  };
}
