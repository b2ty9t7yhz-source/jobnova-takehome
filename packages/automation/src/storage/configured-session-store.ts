import {
  decodeSessionEncryptionKey,
  EncryptedRemoteSessionStore,
} from "./remote-session-store.js";
import { SessionStore, type BrowserSessionStore } from "./session-store.js";

export interface ConfiguredSessionStore {
  kind: "local" | "remote";
  description: string;
  store: BrowserSessionStore;
}

export function createConfiguredSessionStore(
  localFilePath: string,
  environment: NodeJS.ProcessEnv = process.env,
): ConfiguredSessionStore {
  const endpoint = environment.JOBNOVA_SESSION_API_URL?.trim();
  const token = environment.JOBNOVA_SESSION_API_TOKEN?.trim();
  const encodedKey = environment.JOBNOVA_SESSION_ENCRYPTION_KEY?.trim();
  const configuredValues = [endpoint, token, encodedKey].filter(Boolean).length;

  if (configuredValues === 0) {
    return {
      kind: "local",
      description: "an owner-only local file excluded from Git",
      store: new SessionStore(localFilePath),
    };
  }
  if (!endpoint || !token || !encodedKey) {
    throw new Error(
      "Remote session storage requires JOBNOVA_SESSION_API_URL, " +
        "JOBNOVA_SESSION_API_TOKEN, and JOBNOVA_SESSION_ENCRYPTION_KEY together.",
    );
  }

  return {
    kind: "remote",
    description: "a client-side encrypted remote session endpoint",
    store: new EncryptedRemoteSessionStore({
      endpoint,
      token,
      encryptionKey: decodeSessionEncryptionKey(encodedKey),
    }),
  };
}
