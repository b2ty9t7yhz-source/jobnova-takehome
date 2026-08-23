import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type {
  ApplicationDatabase,
  ApplicationRecord,
  ApplicationStatus,
  FailureDetails,
  ManualAction,
  NewApplication,
  WorkflowStep,
} from "../domain/application.js";
import { applicationSources, applicationStatuses, workflowSteps } from "../domain/application.js";
import { transitionApplication } from "../domain/state-machine.js";

const emptyDatabase = (): ApplicationDatabase => ({ version: 1, applications: [] });

export class ApplicationNotFoundError extends Error {
  constructor(id: string) {
    super(`Application ${id} was not found.`);
    this.name = "ApplicationNotFoundError";
  }
}

export class ApplicationRepository {
  private queue: Promise<void> = Promise.resolve();

  constructor(private readonly filePath: string) {}

  async list(): Promise<ApplicationRecord[]> {
    return (await this.read()).applications.toSorted((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async get(id: string): Promise<ApplicationRecord | undefined> {
    return (await this.read()).applications.find((application) => application.id === id);
  }

  async createOrGet(input: NewApplication): Promise<{ record: ApplicationRecord; created: boolean }> {
    return this.locked(async () => {
      const database = await this.read();
      const jobKey = normalizeJobKey(input.jobUrl);
      const existing = database.applications.find((application) => application.jobKey === jobKey);
      if (existing) return { record: existing, created: false };

      const now = new Date().toISOString();
      const record: ApplicationRecord = {
        id: randomUUID(),
        jobKey,
        jobUrl: input.jobUrl,
        source: input.source ?? "live",
        status: "pending",
        currentStep: "created",
        createdAt: now,
        updatedAt: now,
        attempts: 0,
        history: [],
        ...(input.title ? { title: input.title } : {}),
        ...(input.company ? { company: input.company } : {}),
      };

      database.applications.push(record);
      await this.write(database);
      return { record, created: true };
    });
  }

  async transition(
    id: string,
    to: ApplicationStatus,
    step: WorkflowStep,
    reason: string,
  ): Promise<ApplicationRecord> {
    return this.update(id, (record) => transitionApplication(record, to, step, reason));
  }

  async updateMetadata(id: string, metadata: { title?: string; company?: string }): Promise<ApplicationRecord> {
    return this.update(id, (record) => ({
      ...record,
      updatedAt: new Date().toISOString(),
      ...(metadata.title ? { title: metadata.title } : {}),
      ...(metadata.company ? { company: metadata.company } : {}),
    }));
  }

  async pause(id: string, action: ManualAction): Promise<ApplicationRecord> {
    return this.update(id, (record) => ({
      ...transitionApplication(
        record,
        "manual_action_required",
        "awaiting_manual_action",
        action.kind,
        action.detectedAt,
      ),
      manualAction: action,
    }));
  }

  async fail(id: string, failure: FailureDetails): Promise<ApplicationRecord> {
    return this.update(id, (record) => ({
      ...transitionApplication(record, "failed", failure.step, failure.message, failure.failedAt),
      lastFailure: failure,
    }));
  }

  private async update(
    id: string,
    updater: (record: ApplicationRecord) => ApplicationRecord,
  ): Promise<ApplicationRecord> {
    return this.locked(async () => {
      const database = await this.read();
      const index = database.applications.findIndex((application) => application.id === id);
      const current = database.applications[index];
      if (!current) throw new ApplicationNotFoundError(id);

      const updated = updater(current);
      database.applications[index] = updated;
      await this.write(database);
      return updated;
    });
  }

  private async read(): Promise<ApplicationDatabase> {
    try {
      const text = await readFile(this.filePath, "utf8");
      const parsed: unknown = JSON.parse(text);
      assertDatabase(parsed);
      return parsed;
    } catch (error) {
      if (isNodeError(error) && error.code === "ENOENT") return emptyDatabase();
      throw error;
    }
  }

  private async write(database: ApplicationDatabase): Promise<void> {
    const directory = dirname(this.filePath);
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const temporaryPath = `${this.filePath}.${process.pid}.${randomUUID()}.tmp`;
    await writeFile(temporaryPath, `${JSON.stringify(database, null, 2)}\n`, { mode: 0o600 });
    await rename(temporaryPath, this.filePath);
  }

  private async locked<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.queue.then(operation, operation);
    this.queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }
}

export function normalizeJobKey(jobUrl: string): string {
  const url = new URL(jobUrl);
  url.hostname = url.hostname.toLocaleLowerCase();

  const indeedId = url.searchParams.get("jk") ?? url.searchParams.get("vjk");
  if (indeedId && /(^|\.)indeed\.com$/i.test(url.hostname)) {
    return `indeed:${indeedId}`;
  }

  const trackingParameters = [
    "from",
    "fromage",
    "advn",
    "adid",
    "sjdu",
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "xkcb",
  ];
  for (const parameter of trackingParameters) url.searchParams.delete(parameter);
  url.hash = "";
  url.searchParams.sort();
  return url.toString();
}

function assertDatabase(value: unknown): asserts value is ApplicationDatabase {
  if (!value || typeof value !== "object") throw new Error("Application repository is not a JSON object.");
  const candidate = value as Partial<ApplicationDatabase>;
  if (candidate.version !== 1 || !Array.isArray(candidate.applications)) {
    throw new Error("Unsupported application repository format.");
  }

  for (const record of candidate.applications) {
    if (
      !record ||
      typeof record.id !== "string" ||
      !applicationStatuses.includes(record.status) ||
      !workflowSteps.includes(record.currentStep) ||
      (record.source !== undefined && !applicationSources.includes(record.source))
    ) {
      throw new Error("Application repository contains an invalid record.");
    }
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
