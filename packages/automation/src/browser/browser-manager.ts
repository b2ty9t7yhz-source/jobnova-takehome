import { access, mkdir } from "node:fs/promises";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import type { BrowserSessionStore } from "../storage/session-store.js";

export interface BrowserManagerOptions {
  headless: boolean;
  userDataDir?: string;
  cdpUrl?: string;
}

export class BrowserManager {
  private browser: Browser | undefined;
  private context: BrowserContext | undefined;
  private connectedOverCdp = false;

  constructor(
    private readonly sessionStore: BrowserSessionStore,
    private readonly options: BrowserManagerOptions,
  ) {}

  async start(): Promise<{ context: BrowserContext; page: Page; restoredSession: boolean }> {
    if (this.browser || this.context) throw new Error("BrowserManager has already been started.");

    const storageState = await this.sessionStore.load();
    let restoredPersistentProfile = false;

    if (this.options.cdpUrl) {
      this.browser = await chromium.connectOverCDP(assertLocalCdpUrl(this.options.cdpUrl));
      this.context = this.browser.contexts()[0];
      if (!this.context) throw new Error("The connected Chrome instance has no browser context.");
      this.connectedOverCdp = true;
      restoredPersistentProfile = true;
    } else if (this.options.userDataDir) {
      restoredPersistentProfile = await access(this.options.userDataDir)
        .then(() => true)
        .catch(() => false);
      await mkdir(this.options.userDataDir, { recursive: true, mode: 0o700 });
      this.context = await chromium.launchPersistentContext(this.options.userDataDir, {
        headless: this.options.headless,
        channel: "chrome",
        // Playwright adds --no-sandbox by default. It is unnecessary on macOS and
        // makes the visible browser look less trustworthy to identity providers.
        ...(process.platform === "darwin" ? { ignoreDefaultArgs: ["--no-sandbox"] } : {}),
        ...(!restoredPersistentProfile && storageState ? { storageState } : {}),
        viewport: { width: 1360, height: 900 },
        locale: "en-US",
        timezoneId: "America/New_York",
      });
      this.browser = this.context.browser() ?? undefined;
    } else {
      this.browser = await chromium.launch({ headless: this.options.headless });
      this.context = await this.browser.newContext({
        ...(storageState ? { storageState } : {}),
        viewport: { width: 1360, height: 900 },
        locale: "en-US",
        timezoneId: "America/New_York",
      });
    }

    const page = this.context.pages()[0] ?? (await this.context.newPage());
    page.setDefaultTimeout(10_000);

    return {
      context: this.context,
      page,
      restoredSession: Boolean(storageState || restoredPersistentProfile || this.connectedOverCdp),
    };
  }

  async saveSession(): Promise<void> {
    if (!this.context) return;
    await this.sessionStore.save(this.context);
  }

  async close(): Promise<void> {
    if (this.connectedOverCdp) {
      // For an attached Chrome instance, browser.close() disconnects Playwright
      // while leaving the user-owned browser process available for manual review.
      await this.browser?.close().catch(() => undefined);
      this.context = undefined;
      this.browser = undefined;
      this.connectedOverCdp = false;
      return;
    }
    await this.context?.close().catch(() => undefined);
    await this.browser?.close().catch(() => undefined);
    this.context = undefined;
    this.browser = undefined;
  }
}

function assertLocalCdpUrl(value: string): string {
  const url = new URL(value);
  const localHosts = new Set(["127.0.0.1", "localhost", "[::1]"]);
  if (url.protocol !== "http:" || !localHosts.has(url.hostname)) {
    throw new Error("JOBNOVA_CDP_URL must use HTTP on localhost so browser session data stays local.");
  }
  return url.toString();
}
