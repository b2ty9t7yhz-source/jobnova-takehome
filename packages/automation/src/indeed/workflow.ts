import type { Locator, Page } from "playwright";
import type {
  ApplicationRecord,
  ApplicationSource,
  ManualAction,
  ManualActionKind,
  WorkflowStep,
} from "../domain/application.js";
import type { ArtifactStore } from "../observability/artifacts.js";
import type { WorkflowLogger } from "../observability/logger.js";
import type { CandidateProfile } from "../profile/schema.js";
import {
  normalizeJobKey,
  type ApplicationRepository,
} from "../storage/application-repository.js";
import { fillKnownApplicationFields } from "./field-filler.js";
import { detectManualGate } from "./manual-gates.js";

export interface WorkflowInput {
  jobUrl: string;
  profile: CandidateProfile;
  recordId?: string;
  allowSubmit: boolean;
  confirmBeforeSubmit?: () => Promise<boolean>;
  source?: ApplicationSource;
}

export interface WorkflowBrowserManager {
  start(): Promise<{ page: Page; restoredSession: boolean }>;
  saveSession(): Promise<void>;
  close(): Promise<void>;
}

export interface WorkflowResult {
  record: ApplicationRecord;
  outcome: "paused" | "submitted" | "duplicate" | "failed";
}

export class IndeedWorkflow {
  constructor(
    private readonly repository: ApplicationRepository,
    private readonly browserManager: WorkflowBrowserManager,
    private readonly logger: WorkflowLogger,
    private readonly artifacts: ArtifactStore,
  ) {}

  async run(input: WorkflowInput): Promise<WorkflowResult> {
    validateIndeedUrl(input.jobUrl);
    const existing = input.recordId
      ? await this.repository.get(input.recordId)
      : (await this.repository.createOrGet({ jobUrl: input.jobUrl, source: input.source ?? "live" })).record;

    if (!existing) throw new Error(`Application ${input.recordId} was not found.`);
    if (existing.jobKey !== normalizeJobKey(input.jobUrl)) {
      throw new Error("Resume request does not match the saved application URL.");
    }

    if (existing.status === "submitted" || (!input.recordId && existing.status !== "pending")) {
      await this.logger.write({
        level: "warn",
        event: "duplicate_application_blocked",
        applicationId: existing.id,
        status: existing.status,
      });
      return { record: existing, outcome: "duplicate" };
    }

    let record = await this.repository.transition(
      existing.id,
      "in_progress",
      "job_opened",
      input.recordId ? "workflow_resumed" : "workflow_started",
    );
    let page: Page | undefined;
    let step: WorkflowStep = "job_opened";

    try {
      const started = await this.browserManager.start();
      page = started.page;
      await this.logger.write({
        level: "info",
        event: "browser_started",
        applicationId: record.id,
        step,
        status: record.status,
        message: started.restoredSession ? "saved_session_restored" : "new_session",
      });

      await page.goto(input.jobUrl, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(900);

      const gateAtJob = await detectManualGate(page);
      if (gateAtJob) return await this.pauseForGate(record.id, gateAtJob.kind, gateAtJob.message);

      const title = await firstText(page, ["h1", '[data-testid="jobsearch-JobInfoHeader-title"]']);
      const company = await firstText(page, [
        '[data-testid="inlineHeader-companyName"]',
        '[data-company-name="true"]',
      ]);
      record = await this.repository.updateMetadata(record.id, {
        ...(title ? { title: title.replace(/- job post.*$/i, "").trim() } : {}),
        ...(company ? { company } : {}),
      });

      const applyControl = await firstVisible([
        page.getByRole("button", { name: INDEED_APPLY_LABEL }),
        page.getByRole("link", { name: INDEED_APPLY_LABEL }),
      ]);
      if (!applyControl) {
        return await this.pause(
          record.id,
          "unsupported_step",
          "No supported Indeed apply control was detected. Review the job page manually.",
        );
      }

      await applyControl.click();
      await page.waitForTimeout(900);
      step = "application_started";
      record = await this.repository.transition(record.id, "in_progress", step, "application_opened");

      if (!isIndeedHost(page.url())) {
        return await this.pause(
          record.id,
          "external_application",
          "This job redirects to an employer site. The reusable Indeed workflow stopped before transmitting profile data.",
        );
      }

      for (let screen = 0; screen < 12; screen += 1) {
        if (!isIndeedHost(page.url())) {
          return await this.pause(
            record.id,
            "external_application",
            "The application left Indeed during continuation. The workflow stopped before filling any fields on the external site.",
          );
        }

        const gate = await detectManualGate(page);
        if (gate) return await this.pauseForGate(record.id, gate.kind, gate.message);

        const submitControl = await firstVisible([
          page.getByRole("button", { name: /^(submit|submit application)$/i }),
          page.getByRole("link", { name: /^(submit|submit application)$/i }),
        ]);

        if (submitControl) {
          record = await this.repository.transition(
            record.id,
            "in_progress",
            "awaiting_review",
            "final_review_reached",
          );

          if (!input.allowSubmit || !input.confirmBeforeSubmit) {
            return await this.pause(
              record.id,
              "final_review",
              "Application is filled and ready for your review. Final submission remains disabled by default.",
            );
          }

          const confirmed = await input.confirmBeforeSubmit();
          if (!confirmed) {
            return await this.pause(
              record.id,
              "final_review",
              "Final submission was not confirmed. The application remains ready for review.",
            );
          }

          record = await this.repository.transition(record.id, "in_progress", "submitting", "user_confirmed_submit");
          await submitControl.click();
          await page.waitForTimeout(1_200);

          if (await hasSubmissionConfirmation(page)) {
            record = await this.repository.transition(record.id, "submitted", "complete", "submission_confirmed");
            await this.logger.write({
              level: "info",
              event: "application_submitted",
              applicationId: record.id,
              step: record.currentStep,
              status: record.status,
            });
            return { record, outcome: "submitted" };
          }

          return await this.pause(
            record.id,
            "submission_unconfirmed",
            "The submit control was activated, but no authoritative confirmation was detected. Verify the result manually.",
          );
        }

        step = "profile_filling";
        record = await this.repository.transition(record.id, "in_progress", step, `screen_${screen + 1}`);
        const fillResult = await fillKnownApplicationFields(page, input.profile);
        await this.logger.write({
          level: "info",
          event: "profile_fields_processed",
          applicationId: record.id,
          step,
          status: record.status,
          message: `${fillResult.filledFields.length}_fields_filled`,
        });

        if (fillResult.unresolvedRequiredFields.length > 0) {
          return await this.pause(
            record.id,
            "unknown_question",
            "Required questions need your judgment. No answers were guessed.",
            fillResult.unresolvedRequiredFields,
          );
        }

        const nextControl = await firstVisible([
          page.getByRole("button", { name: /^(continue|next|review your application|review application)$/i }),
          page.getByRole("link", { name: /^(continue|next|review your application|review application)$/i }),
        ]);
        if (!nextControl) {
          return await this.pause(
            record.id,
            "unsupported_step",
            "The current page has no recognized safe continuation control. Review it manually.",
          );
        }

        await nextControl.click();
        await page.waitForTimeout(700);
      }

      return await this.pause(
        record.id,
        "unsupported_step",
        "The workflow reached its 12-screen safety limit. Review the remaining application manually.",
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const screenshotPath = page
        ? await this.artifacts.captureFailure(page, record.id, step)
        : undefined;
      record = await this.repository.fail(record.id, {
        message,
        failedAt: new Date().toISOString(),
        step,
        url: page?.url() ?? input.jobUrl,
        ...(screenshotPath ? { screenshotPath } : {}),
      });
      await this.logger.write({
        level: "error",
        event: "workflow_failed",
        applicationId: record.id,
        step,
        status: record.status,
        message,
      });
      return { record, outcome: "failed" };
    } finally {
      await this.browserManager.saveSession().catch(() => undefined);
      await this.browserManager.close();
    }
  }

  private async pauseForGate(
    applicationId: string,
    kind: ManualActionKind,
    message: string,
  ): Promise<WorkflowResult> {
    return this.pause(applicationId, kind, message);
  }

  private async pause(
    applicationId: string,
    kind: ManualActionKind,
    message: string,
    fields: string[] = [],
  ): Promise<WorkflowResult> {
    const action: ManualAction = {
      kind,
      message,
      fields,
      detectedAt: new Date().toISOString(),
    };
    const record = await this.repository.pause(applicationId, action);
    await this.logger.write({
      level: "warn",
      event: "manual_action_required",
      applicationId,
      step: record.currentStep,
      status: record.status,
      message: kind,
    });
    return { record, outcome: "paused" };
  }
}

export const INDEED_APPLY_LABEL = /^(apply now|easily apply|apply (?:on|with) indeed)$/i;

function validateIndeedUrl(jobUrl: string): void {
  const url = new URL(jobUrl);
  if (!isIndeedHost(url.toString())) {
    throw new Error("Only Indeed job URLs are accepted by this workflow.");
  }
}

function isIndeedHost(rawUrl: string): boolean {
  try {
    return /(^|\.)indeed\.com$/i.test(new URL(rawUrl).hostname);
  } catch {
    return false;
  }
}

async function firstVisible(locators: Locator[]): Promise<Locator | undefined> {
  for (const candidate of locators) {
    const count = await candidate.count();
    for (let index = 0; index < count; index += 1) {
      const locator = candidate.nth(index);
      if (await locator.isVisible().catch(() => false)) return locator;
    }
  }
  return undefined;
}

async function firstText(page: Page, selectors: string[]): Promise<string | undefined> {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if ((await locator.count()) === 0) continue;
    const text = await locator.innerText().catch(() => "");
    if (text.trim()) return text.trim();
  }
  return undefined;
}

async function hasSubmissionConfirmation(page: Page): Promise<boolean> {
  const text = await page.locator("body").innerText().catch(() => "");
  return /application (has been )?submitted|successfully applied|your application was sent/i.test(text);
}
