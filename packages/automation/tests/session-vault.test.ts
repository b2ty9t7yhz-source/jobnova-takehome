import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { EncryptedSessionVault } from "../src/session-vault/service.js";

const temporaryDirectories: string[] = [];
const envelope = JSON.stringify({
  version: 1,
  algorithm: "aes-256-gcm",
  iv: "c3ludGhldGljLWl2",
  authTag: "c3ludGhldGljLXRhZw==",
  ciphertext: "Y2lwaGVydGV4dC1vbmx5",
});

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true })),
  );
});

async function createVault() {
  const directory = await mkdtemp(join(tmpdir(), "jobnova-vault-"));
  temporaryDirectories.push(directory);
  return new EncryptedSessionVault({
    rootDirectory: directory,
    tenantTokens: { alice: "alice-token", bob: "bob-token" },
  });
}

describe("encrypted session vault", () => {
  it("persists only a validated encrypted envelope in an owner-only tenant file", async () => {
    const vault = await createVault();
    const put = await vault.handle({
      method: "PUT",
      pathname: "/v1/users/alice/indeed",
      authorization: "Bearer alice-token",
      body: envelope,
    });

    expect(put.status).toBe(204);
    const path = vault.sessionPath("alice", "indeed");
    expect(JSON.parse(await readFile(path, "utf8"))).toEqual(JSON.parse(envelope));
    expect((await stat(path)).mode & 0o777).toBe(0o600);

    const get = await vault.handle({
      method: "GET",
      pathname: "/v1/users/alice/indeed",
      authorization: "Bearer alice-token",
    });
    expect(get.status).toBe(200);
    expect(JSON.parse(get.body ?? "")).toEqual(JSON.parse(envelope));
    expect(get.headers["cache-control"]).toBe("no-store");
  });

  it("binds bearer credentials to one tenant", async () => {
    const vault = await createVault();
    expect(
      (
        await vault.handle({
          method: "GET",
          pathname: "/v1/users/bob/indeed",
          authorization: "Bearer alice-token",
        })
      ).status,
    ).toBe(401);
    expect(
      (
        await vault.handle({
          method: "GET",
          pathname: "/v1/users/alice/indeed",
          authorization: "Bearer wrong-token",
        })
      ).status,
    ).toBe(401);
  });

  it("rejects malformed and oversized envelopes", async () => {
    const vault = await createVault();
    const request = {
      method: "PUT",
      pathname: "/v1/users/alice/indeed",
      authorization: "Bearer alice-token",
    };
    expect((await vault.handle({ ...request, body: '{"cookies":[]}' })).status).toBe(400);

    const smallVault = new EncryptedSessionVault({
      rootDirectory: vault.sessionPath("alice", "indeed"),
      tenantTokens: { alice: "alice-token" },
      maximumEnvelopeBytes: 10,
    });
    expect((await smallVault.handle({ ...request, body: envelope })).status).toBe(413);
  });

  it("supports explicit session revocation", async () => {
    const vault = await createVault();
    const request = {
      pathname: "/v1/users/alice/indeed",
      authorization: "Bearer alice-token",
    };
    await vault.handle({ ...request, method: "PUT", body: envelope });
    expect((await vault.handle({ ...request, method: "DELETE" })).status).toBe(204);
    expect((await vault.handle({ ...request, method: "GET" })).status).toBe(404);
  });
});
