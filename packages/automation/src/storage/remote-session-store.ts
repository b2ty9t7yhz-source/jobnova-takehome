import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import type { BrowserContext } from "playwright";
import {
  parseStorageState,
  type BrowserSessionStore,
  type InlineStorageState,
} from "./session-store.js";

const algorithm = "aes-256-gcm";
const additionalAuthenticatedData = Buffer.from("jobnova.browser-session.v1", "utf8");
const maximumEnvelopeBytes = 2 * 1024 * 1024;

export interface EncryptedSessionEnvelope {
  version: 1;
  algorithm: typeof algorithm;
  iv: string;
  authTag: string;
  ciphertext: string;
}

export interface RemoteSessionStoreOptions {
  endpoint: string;
  token: string;
  encryptionKey: Uint8Array;
  fetchImpl?: typeof fetch;
}

/**
 * Stores only client-side encrypted Playwright storage state in a remote HTTPS endpoint.
 * The remote service never receives the plaintext cookies, origin storage, or encryption key.
 */
export class EncryptedRemoteSessionStore implements BrowserSessionStore {
  private readonly endpoint: string;
  private readonly token: string;
  private readonly encryptionKey: Buffer;
  private readonly fetchImpl: typeof fetch;

  constructor(options: RemoteSessionStoreOptions) {
    this.endpoint = assertRemoteEndpoint(options.endpoint);
    this.token = options.token.trim();
    if (!this.token) throw new Error("JOBNOVA_SESSION_API_TOKEN must not be empty.");
    this.encryptionKey = Buffer.from(options.encryptionKey);
    if (this.encryptionKey.byteLength !== 32) {
      throw new Error("JOBNOVA_SESSION_ENCRYPTION_KEY must decode to exactly 32 bytes.");
    }
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async load(): Promise<InlineStorageState | undefined> {
    const response = await this.fetchImpl(this.endpoint, {
      method: "GET",
      headers: this.requestHeaders(),
      redirect: "error",
    });
    if (response.status === 404) return undefined;
    if (!response.ok) throw new Error(`Remote session load failed with HTTP ${response.status}.`);

    const body = await response.text();
    if (Buffer.byteLength(body, "utf8") > maximumEnvelopeBytes) {
      throw new Error("Remote session envelope exceeds the 2 MiB safety limit.");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch {
      throw new Error("Remote session endpoint returned invalid JSON.");
    }
    return decryptEnvelope(parseEncryptedSessionEnvelope(parsed), this.encryptionKey);
  }

  async save(context: BrowserContext): Promise<void> {
    const state = parseStorageState(await context.storageState());
    const envelope = encryptState(state, this.encryptionKey);
    const response = await this.fetchImpl(this.endpoint, {
      method: "PUT",
      headers: {
        ...this.requestHeaders(),
        "content-type": "application/json",
      },
      body: JSON.stringify(envelope),
      redirect: "error",
    });
    if (!response.ok) throw new Error(`Remote session save failed with HTTP ${response.status}.`);
  }

  private requestHeaders(): Record<string, string> {
    return {
      accept: "application/json",
      authorization: `Bearer ${this.token}`,
    };
  }
}

export function decodeSessionEncryptionKey(value: string): Buffer {
  const normalized = value.trim();
  if (!normalized) throw new Error("JOBNOVA_SESSION_ENCRYPTION_KEY must not be empty.");
  const key = Buffer.from(normalized, "base64");
  if (key.byteLength !== 32) {
    throw new Error("JOBNOVA_SESSION_ENCRYPTION_KEY must be base64 for exactly 32 bytes.");
  }
  return key;
}

function encryptState(state: InlineStorageState, key: Buffer): EncryptedSessionEnvelope {
  const iv = randomBytes(12);
  const cipher = createCipheriv(algorithm, key, iv);
  cipher.setAAD(additionalAuthenticatedData);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(state), "utf8"),
    cipher.final(),
  ]);
  return {
    version: 1,
    algorithm,
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };
}

function decryptEnvelope(envelope: EncryptedSessionEnvelope, key: Buffer): InlineStorageState {
  try {
    const decipher = createDecipheriv(algorithm, key, decodeBase64(envelope.iv, "iv"));
    decipher.setAAD(additionalAuthenticatedData);
    decipher.setAuthTag(decodeBase64(envelope.authTag, "authTag"));
    const plaintext = Buffer.concat([
      decipher.update(decodeBase64(envelope.ciphertext, "ciphertext")),
      decipher.final(),
    ]).toString("utf8");
    return parseStorageState(JSON.parse(plaintext) as unknown);
  } catch {
    throw new Error("Remote session envelope could not be authenticated or decrypted.");
  }
}

export function parseEncryptedSessionEnvelope(value: unknown): EncryptedSessionEnvelope {
  if (!value || typeof value !== "object") throw new Error("Remote session envelope is invalid.");
  const candidate = value as Partial<EncryptedSessionEnvelope>;
  if (
    candidate.version !== 1 ||
    candidate.algorithm !== algorithm ||
    typeof candidate.iv !== "string" ||
    typeof candidate.authTag !== "string" ||
    typeof candidate.ciphertext !== "string"
  ) {
    throw new Error("Remote session envelope is invalid.");
  }
  return candidate as EncryptedSessionEnvelope;
}

function decodeBase64(value: string, field: string): Buffer {
  const decoded = Buffer.from(value, "base64");
  if (decoded.byteLength === 0) throw new Error(`Remote session ${field} is invalid.`);
  return decoded;
}

function assertRemoteEndpoint(value: string): string {
  const url = new URL(value);
  if (url.protocol !== "https:") {
    throw new Error("JOBNOVA_SESSION_API_URL must use HTTPS.");
  }
  if (url.username || url.password || url.hash) {
    throw new Error("JOBNOVA_SESSION_API_URL must not contain credentials or a URL fragment.");
  }
  return url.toString();
}
