import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium, type Browser, type BrowserContext, type Page, type Route } from "playwright";
import { IndeedWorkflow, type WorkflowBrowserManager } from "../indeed/workflow.js";
import { ArtifactStore } from "../observability/artifacts.js";
import { WorkflowLogger } from "../observability/logger.js";
import type { CandidateProfile } from "../profile/schema.js";
import { ApplicationRepository } from "../storage/application-repository.js";

export interface WorkflowFixtureResult {
  reachedFinalReview: boolean;
  profileFieldsCaptured: boolean;
  exactAnswerCaptured: boolean;
  resumeAttached: boolean;
  submitRequestCount: number;
  historyLength: number;
  source: string;
}

export async function runWorkflowFixtureDemo(): Promise<WorkflowFixtureResult> {
  const directory = await mkdtemp(join(tmpdir(), "jobnova-workflow-fixture-"));
  const resumePath = join(directory, "synthetic-resume.pdf");
  await writeFile(resumePath, "%PDF-1.4 synthetic workflow fixture");
  const capture: FixtureCapture = { contact: {}, answers: {}, submitRequestCount: 0 };
  const browserManager = new FixtureBrowserManager(capture);
  const repository = new ApplicationRepository(join(directory, "applications.json"));
  const workflow = new IndeedWorkflow(
    repository,
    browserManager,
    new WorkflowLogger(join(directory, "workflow.jsonl")),
    new ArtifactStore(join(directory, "artifacts")),
  );

  const profile: CandidateProfile = {
    identity: {
      firstName: "Synthetic",
      lastName: "Candidate",
      email: "synthetic@example.test",
      phone: "+1 555 555 0100",
    },
    location: { city: "Chapel Hill", state: "NC", country: "United States" },
    resumePath,
    education: [],
    experience: [],
    workPreferences: {
      targetRoles: ["Software Engineer"],
      locations: ["North Carolina"],
      remote: true,
      employmentTypes: ["Full time"],
    },
    knownAnswers: {
      "Preferred schedule": "Full time",
      "I confirm this is synthetic test data": true,
    },
  };

  try {
    const result = await workflow.run({
      jobUrl: "https://www.indeed.com/viewjob?jk=jobnova-synthetic-fixture",
      profile,
      allowSubmit: false,
      source: "demo",
    });

    return {
      reachedFinalReview:
        result.outcome === "paused" &&
        result.record.status === "manual_action_required" &&
        result.record.manualAction?.kind === "final_review",
      profileFieldsCaptured:
        capture.contact.firstName === "Synthetic" &&
        capture.contact.lastName === "Candidate" &&
        capture.contact.state === "NC" &&
        capture.contact.country === "United States",
      exactAnswerCaptured:
        capture.answers.schedule === "Full time" && capture.answers.syntheticConfirmation === "on",
      resumeAttached: capture.contact.resumeAttached === "yes",
      submitRequestCount: capture.submitRequestCount,
      historyLength: result.record.history.length,
      source: result.record.source ?? "live",
    };
  } finally {
    await browserManager.close();
    await rm(directory, { recursive: true });
  }
}

interface FixtureCapture {
  contact: Record<string, string>;
  answers: Record<string, string>;
  submitRequestCount: number;
}

class FixtureBrowserManager implements WorkflowBrowserManager {
  private browser: Browser | undefined;
  private context: BrowserContext | undefined;
  private page: Page | undefined;

  constructor(private readonly capture: FixtureCapture) {}

  async start(): Promise<{ page: Page; restoredSession: boolean }> {
    this.browser = await chromium.launch({ headless: true });
    this.context = await this.browser.newContext();
    this.page = await this.context.newPage();
    await this.page.route("**/*", (route) => this.fulfillFixture(route));
    return { page: this.page, restoredSession: false };
  }

  async saveSession(): Promise<void> {}

  async close(): Promise<void> {
    await this.context?.close().catch(() => undefined);
    await this.browser?.close().catch(() => undefined);
    this.page = undefined;
    this.context = undefined;
    this.browser = undefined;
  }

  private async fulfillFixture(route: Route): Promise<void> {
    const url = new URL(route.request().url());
    if (!/(^|\.)indeed\.com$/i.test(url.hostname)) {
      await route.abort("blockedbyclient");
      return;
    }

    if (url.pathname === "/viewjob") {
      await route.fulfill({ status: 200, contentType: "text/html", body: jobPage });
      return;
    }
    if (url.pathname === "/fixture/contact") {
      await route.fulfill({ status: 200, contentType: "text/html", body: contactPage });
      return;
    }
    if (url.pathname === "/fixture/questions") {
      this.capture.contact = Object.fromEntries(url.searchParams);
      await route.fulfill({ status: 200, contentType: "text/html", body: questionsPage });
      return;
    }
    if (url.pathname === "/fixture/review") {
      this.capture.answers = Object.fromEntries(url.searchParams);
      await route.fulfill({ status: 200, contentType: "text/html", body: reviewPage });
      return;
    }
    if (url.pathname === "/fixture/submitted") {
      this.capture.submitRequestCount += 1;
      await route.fulfill({ status: 200, contentType: "text/html", body: "Application submitted" });
      return;
    }
    await route.fulfill({ status: 404, contentType: "text/plain", body: "Synthetic fixture not found" });
  }
}

const jobPage = `<!doctype html>
<html><head><title>Synthetic Software Engineer - job post</title></head><body>
  <h1 data-testid="jobsearch-JobInfoHeader-title">Synthetic Software Engineer</h1>
  <p data-testid="inlineHeader-companyName">JobNova Synthetic Employer</p>
  <a href="https://smartapply.indeed.com/fixture/contact">Apply with Indeed</a>
</body></html>`;

const contactPage = `<!doctype html>
<html><head><title>Contact information</title></head><body>
  <form action="https://smartapply.indeed.com/fixture/questions" method="get"
    onsubmit="this.elements.resumeAttached.value = this.elements.resume.files.length ? 'yes' : 'no'">
    <label>First name <input required name="firstName"></label>
    <label>Last name <input required name="lastName"></label>
    <label>Email address <input required name="email" type="email"></label>
    <label>Phone number <input required name="phone"></label>
    <label>City <input required name="city"></label>
    <label>State <select required name="state"><option value="">Choose</option><option>NC</option></select></label>
    <label>Country <select required name="country"><option value="">Choose</option><option>United States</option></select></label>
    <label>Resume <input required name="resume" type="file"></label>
    <input type="hidden" name="resumeAttached" value="no">
    <button type="submit">Continue</button>
  </form>
</body></html>`;

const questionsPage = `<!doctype html>
<html><head><title>Employer questions</title></head><body>
  <form action="https://smartapply.indeed.com/fixture/review" method="get">
    <fieldset><legend>Preferred schedule</legend>
      <label><input required type="radio" name="schedule" value="Full time"> Full time</label>
      <label><input required type="radio" name="schedule" value="Part time"> Part time</label>
    </fieldset>
    <label><input required type="checkbox" name="syntheticConfirmation"> I confirm this is synthetic test data</label>
    <button type="submit">Review application</button>
  </form>
</body></html>`;

const reviewPage = `<!doctype html>
<html><head><title>Review application</title></head><body>
  <h1>Review your application</h1>
  <a role="button" href="https://smartapply.indeed.com/fixture/submitted">Submit application</a>
</body></html>`;
