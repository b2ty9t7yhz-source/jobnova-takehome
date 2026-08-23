import { randomBytes } from "node:crypto";
import type { BrowserContext } from "playwright";
import { describe, expect, it } from "vitest";
import { createConfiguredSessionStore } from "../src/storage/configured-session-store.js";
import { EncryptedRemoteSessionStore } from "../src/storage/remote-session-store.js";

const state = {
  cookies: [
    {
      name: "session",
      value: "private-cookie-value",
      domain: ".indeed.com",
      path: "/",
      expires: -1,
      httpOnly: true,
      secure: true,
      sameSite: "Lax" as const,
    },
  ],
  origins: [],
};

describe("encrypted remote session store", () => {
  it("round-trips storage state without sending plaintext session data", async () => {
    let savedEnvelope = "";
    const fetchImpl: typeof fetch = async (_input, init) => {
      if (init?.method === "PUT") {
        savedEnvelope = String(init.body);
        expect(new Headers(init.headers).get("authorization")).toBe("Bearer test-token");
        return new Response(null, { status: 204 });
      }
      return new Response(savedEnvelope, {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    };
    const store = new EncryptedRemoteSessionStore({
      endpoint: "https://sessions.example.test/v1/candidate/indeed",
      token: "test-token",
      encryptionKey: randomBytes(32),
      fetchImpl,
    });
    const context = { storageState: async () => state } as unknown as BrowserContext;

    await store.save(context);

    expect(savedEnvelope).not.toContain("private-cookie-value");
    expect(JSON.parse(savedEnvelope)).toMatchObject({ version: 1, algorithm: "aes-256-gcm" });
    expect(await store.load()).toEqual(state);
  });

  it("rejects a tampered encrypted envelope", async () => {
    let savedEnvelope = "";
    let readCount = 0;
    const fetchImpl: typeof fetch = async (_input, init) => {
      if (init?.method === "PUT") {
        savedEnvelope = String(init.body);
        return new Response(null, { status: 204 });
      }
      readCount += 1;
      const envelope = JSON.parse(savedEnvelope) as { ciphertext: string };
      envelope.ciphertext = `${envelope.ciphertext.slice(0, -4)}AAAA`;
      return new Response(JSON.stringify(envelope), { status: 200 });
    };
    const store = new EncryptedRemoteSessionStore({
      endpoint: "https://sessions.example.test/session",
      token: "test-token",
      encryptionKey: randomBytes(32),
      fetchImpl,
    });
    const context = { storageState: async () => state } as unknown as BrowserContext;
    await store.save(context);

    await expect(store.load()).rejects.toThrow("authenticated or decrypted");
    expect(readCount).toBe(1);
  });

  it("requires HTTPS and complete remote configuration", () => {
    expect(
      () =>
        new EncryptedRemoteSessionStore({
          endpoint: "http://sessions.example.test/session",
          token: "test-token",
          encryptionKey: randomBytes(32),
        }),
    ).toThrow("must use HTTPS");

    expect(() =>
      createConfiguredSessionStore("/tmp/local-session.json", {
        JOBNOVA_SESSION_API_URL: "https://sessions.example.test/session",
      }),
    ).toThrow("requires JOBNOVA_SESSION_API_URL");
  });
});
