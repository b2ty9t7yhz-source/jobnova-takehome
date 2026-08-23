import { randomUUID, timingSafeEqual } from "node:crypto";
import { chmod, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { createServer, type Server as HttpsServer } from "node:https";
import { dirname, resolve } from "node:path";
import { parseEncryptedSessionEnvelope } from "../storage/remote-session-store.js";

const defaultMaximumEnvelopeBytes = 2 * 1024 * 1024;
const routePattern = /^\/v1\/users\/([A-Za-z0-9_-]{1,64})\/(indeed)$/;

export interface SessionVaultOptions {
  rootDirectory: string;
  tenantTokens: Readonly<Record<string, string>>;
  maximumEnvelopeBytes?: number;
}

export interface SessionVaultRequest {
  method: "GET" | "PUT" | "DELETE" | string;
  pathname: string;
  authorization?: string;
  body?: string;
}

export interface SessionVaultResponse {
  status: number;
  headers: Record<string, string>;
  body?: string;
}

/**
 * A deliberately small tenant-scoped service for encrypted browser-session envelopes.
 * It validates and stores ciphertext, but never receives the client encryption key or
 * attempts to decrypt cookies and origin storage.
 */
export class EncryptedSessionVault {
  private readonly rootDirectory: string;
  private readonly tenantTokens: Readonly<Record<string, string>>;
  private readonly maximumEnvelopeBytes: number;

  constructor(options: SessionVaultOptions) {
    this.rootDirectory = resolve(options.rootDirectory);
    this.tenantTokens = options.tenantTokens;
    this.maximumEnvelopeBytes = options.maximumEnvelopeBytes ?? defaultMaximumEnvelopeBytes;

    if (this.maximumEnvelopeBytes < 1) {
      throw new Error("Session vault maximum envelope size must be positive.");
    }
    for (const [userId, token] of Object.entries(this.tenantTokens)) {
      if (!/^[A-Za-z0-9_-]{1,64}$/.test(userId)) {
        throw new Error(`Session vault user ID is invalid: ${userId}`);
      }
      if (!token.trim()) throw new Error(`Session vault token for ${userId} must not be empty.`);
    }
  }

  async handle(request: SessionVaultRequest): Promise<SessionVaultResponse> {
    const match = routePattern.exec(request.pathname);
    if (!match) return response(404, "Not found.");
    const [, userId, provider] = match;
    if (!userId || !provider) return response(404, "Not found.");
    if (!this.isAuthorized(userId, request.authorization)) {
      return response(401, "Unauthorized.", { "www-authenticate": "Bearer" });
    }

    const filePath = this.sessionPath(userId, provider);
    if (request.method === "GET") {
      try {
        return {
          status: 200,
          headers: securityHeaders("application/json"),
          body: await readFile(filePath, "utf8"),
        };
      } catch (error) {
        if (isNodeError(error) && error.code === "ENOENT") return response(404, "Not found.");
        throw error;
      }
    }

    if (request.method === "PUT") {
      const body = request.body ?? "";
      if (Buffer.byteLength(body, "utf8") > this.maximumEnvelopeBytes) {
        return response(413, "Encrypted session envelope is too large.");
      }

      try {
        parseEncryptedSessionEnvelope(JSON.parse(body) as unknown);
      } catch {
        return response(400, "Encrypted session envelope is invalid.");
      }

      await this.atomicWrite(filePath, `${body}\n`);
      return { status: 204, headers: securityHeaders() };
    }

    if (request.method === "DELETE") {
      await rm(filePath, { force: true });
      return { status: 204, headers: securityHeaders() };
    }

    return response(405, "Method not allowed.", { allow: "GET, PUT, DELETE" });
  }

  sessionPath(userId: string, provider: string): string {
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(userId) || provider !== "indeed") {
      throw new Error("Invalid session vault path.");
    }
    return resolve(this.rootDirectory, userId, `${provider}.json`);
  }

  private isAuthorized(userId: string, authorization?: string): boolean {
    const expected = this.tenantTokens[userId];
    const supplied = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
    if (!expected || !supplied) return false;
    const expectedDigest = Buffer.from(expected, "utf8");
    const suppliedDigest = Buffer.from(supplied, "utf8");
    return (
      expectedDigest.byteLength === suppliedDigest.byteLength &&
      timingSafeEqual(expectedDigest, suppliedDigest)
    );
  }

  private async atomicWrite(filePath: string, contents: string): Promise<void> {
    const directory = dirname(filePath);
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const temporaryPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
    await writeFile(temporaryPath, contents, { mode: 0o600 });
    await chmod(temporaryPath, 0o600);
    await rename(temporaryPath, filePath);
  }
}

export interface SessionVaultHttpsOptions {
  cert: string | Buffer;
  key: string | Buffer;
  maximumRequestBytes?: number;
}

export function createSessionVaultHttpsServer(
  vault: EncryptedSessionVault,
  options: SessionVaultHttpsOptions,
): HttpsServer {
  const maximumRequestBytes = options.maximumRequestBytes ?? defaultMaximumEnvelopeBytes;
  return createServer({ cert: options.cert, key: options.key }, async (request, serverResponse) => {
    try {
      const body = await readRequestBody(request, maximumRequestBytes);
      const result = await vault.handle({
        method: request.method ?? "GET",
        pathname: new URL(request.url ?? "/", "https://session-vault.local").pathname,
        ...(request.headers.authorization ? { authorization: request.headers.authorization } : {}),
        ...(body ? { body } : {}),
      });
      serverResponse.writeHead(result.status, result.headers);
      serverResponse.end(result.body);
    } catch (error) {
      const tooLarge = error instanceof Error && error.message === "request_too_large";
      const result = response(tooLarge ? 413 : 500, tooLarge ? "Request is too large." : "Internal error.");
      serverResponse.writeHead(result.status, result.headers);
      serverResponse.end(result.body);
    }
  });
}

function readRequestBody(
  request: NodeJS.ReadableStream,
  maximumRequestBytes: number,
): Promise<string> {
  return new Promise((resolveBody, rejectBody) => {
    const chunks: Buffer[] = [];
    let bytes = 0;
    request.on("data", (chunk: Buffer | string) => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      bytes += buffer.byteLength;
      if (bytes > maximumRequestBytes) {
        rejectBody(new Error("request_too_large"));
        return;
      }
      chunks.push(buffer);
    });
    request.on("end", () => resolveBody(Buffer.concat(chunks).toString("utf8")));
    request.on("error", rejectBody);
  });
}

function response(
  status: number,
  message: string,
  extraHeaders: Record<string, string> = {},
): SessionVaultResponse {
  return {
    status,
    headers: { ...securityHeaders("application/json"), ...extraHeaders },
    body: `${JSON.stringify({ error: message })}\n`,
  };
}

function securityHeaders(contentType?: string): Record<string, string> {
  return {
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    ...(contentType ? { "content-type": contentType } : {}),
  };
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
