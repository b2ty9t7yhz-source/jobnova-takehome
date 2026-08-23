import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { Page } from "playwright";

export class ArtifactStore {
  constructor(private readonly directory: string) {}

  async captureFailure(page: Page, applicationId: string, step: string): Promise<string | undefined> {
    try {
      await mkdir(this.directory, { recursive: true, mode: 0o700 });
      const timestamp = new Date().toISOString().replaceAll(/[:.]/g, "-");
      const safeId = applicationId.replaceAll(/[^a-zA-Z0-9-]/g, "_");
      const safeStep = step.replaceAll(/[^a-zA-Z0-9-]/g, "_");
      const path = join(this.directory, `${timestamp}-${safeId}-${safeStep}.png`);
      await page.screenshot({ path, fullPage: true });
      return path;
    } catch {
      return undefined;
    }
  }
}
