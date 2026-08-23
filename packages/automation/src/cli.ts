#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { Command } from "commander";
import { BrowserManager } from "./browser/browser-manager.js";
import { defaultHeadless, resolveRuntimePaths } from "./config.js";
import { seedDemoApplications } from "./demo/seed-demo.js";
import { runSessionVaultDemo } from "./demo/session-vault-demo.js";
import { runWorkflowFixtureDemo } from "./demo/workflow-fixture-demo.js";
import { detectManualGate } from "./indeed/manual-gates.js";
import { IndeedWorkflow } from "./indeed/workflow.js";
import { ArtifactStore } from "./observability/artifacts.js";
import { WorkflowLogger } from "./observability/logger.js";
import { assertProfileReadyForLiveApplication, loadCandidateProfile } from "./profile/schema.js";
import { loadJobPlan } from "./profile/job-plan.js";
import {
  createSessionVaultHttpsServer,
  EncryptedSessionVault,
} from "./session-vault/service.js";
import { ApplicationRepository } from "./storage/application-repository.js";
import {
  createConfiguredSessionStore,
  type ConfiguredSessionStore,
} from "./storage/configured-session-store.js";

const program = new Command();

program
  .name("jobnova")
  .description("Safe, review-first Indeed application workflow")
  .version("0.1.0");

program
  .command("profile:validate")
  .description("Validate a local candidate profile without sending it anywhere")
  .requiredOption("--profile <path>", "Path to profile.local.json")
  .option("--live-ready", "Also enforce the stricter preflight used before a live application", false)
  .action(async ({ profile, liveReady }: { profile: string; liveReady: boolean }) => {
    const validated = await loadCandidateProfile(profile);
    if (liveReady) await assertProfileReadyForLiveApplication(validated);
    console.log(
      `Profile is valid for ${validated.identity.firstName} ${validated.identity.lastName}. ` +
        `${validated.education.length} education record(s), ${validated.experience.length} experience record(s).`,
    );
    if (liveReady) console.log("Live-application preflight passed, including readable resume and placeholder checks.");
  });

program
  .command("plan:validate")
  .description("Validate a candidate-reviewed plan of one to three suitable Indeed jobs")
  .requiredOption("--plan <path>", "Path to job-plan.local.json")
  .action(async ({ plan }: { plan: string }) => {
    const validated = await loadJobPlan(plan);
    console.log(`Job plan is valid with ${validated.jobs.length} candidate-reviewed role(s).`);
    for (const [index, job] of validated.jobs.entries()) {
      console.log(`${index + 1}. ${job.title} at ${job.company}: ${job.fitReason}`);
    }
  });

program
  .command("login")
  .description("Open Indeed for manual sign-in or verification, then securely save the session")
  .option("--headless", "Run without a visible browser (not recommended for login)", defaultHeadless())
  .action(async ({ headless }: { headless: boolean }) => {
    const paths = resolveRuntimePaths();
    const configuredSession = createConfiguredSessionStore(paths.session);
    const manager = createBrowserManager(configuredSession, paths.browserProfile, headless);
    const readline = createInterface({ input, output });

    try {
      const { page, restoredSession } = await manager.start();
      console.log(restoredSession ? "A saved session was restored." : "No saved session was found.");
      await page.goto("https://secure.indeed.com/auth", {
        waitUntil: "commit",
        timeout: 30_000,
      });
      console.log(
        "Complete sign-in, SMS/email verification, or CAPTCHA yourself in the browser. " +
          "The workflow will not bypass these checks.",
      );
      await readline.question("Press Enter only after the account page is ready: ");
      const gate = await detectManualGate(page);
      if (gate) console.warn(`Verification may still be incomplete: ${gate.message}`);
      await manager.saveSession();
      console.log(`Session saved using ${configuredSession.description}.`);
    } finally {
      readline.close();
      await manager.close();
    }
  });

program
  .command("apply")
  .description("Start a new Indeed application in review-before-submit mode")
  .requiredOption("--job-url <url>", "Indeed job URL")
  .requiredOption("--profile <path>", "Path to profile.local.json")
  .option("--headless", "Run without a visible browser", defaultHeadless())
  .option(
    "--confirm-submit",
    "Permit an action-time SUBMIT confirmation prompt when the final review screen is reached",
    false,
  )
  .action(
    async (options: { jobUrl: string; profile: string; headless: boolean; confirmSubmit: boolean }) => {
      const result = await runWorkflow({
        jobUrl: options.jobUrl,
        profilePath: options.profile,
        headless: options.headless,
        allowSubmit: options.confirmSubmit,
      });
      printWorkflowResult(result);
    },
  );

program
  .command("apply:batch")
  .description("Process a bounded plan of up to three suitable jobs sequentially")
  .requiredOption("--plan <path>", "Path to candidate-reviewed job-plan.local.json")
  .requiredOption("--profile <path>", "Path to profile.local.json")
  .option("--headless", "Run without a visible browser", defaultHeadless())
  .option(
    "--confirm-submit",
    "Permit a separate action-time SUBMIT confirmation for each final review screen",
    false,
  )
  .action(
    async (options: { plan: string; profile: string; headless: boolean; confirmSubmit: boolean }) => {
      const plan = await loadJobPlan(options.plan);
      for (const [index, job] of plan.jobs.entries()) {
        console.log(`\n[${index + 1}/${plan.jobs.length}] ${job.title} at ${job.company}`);
        console.log(`Candidate-reviewed fit: ${job.fitReason}`);
        const result = await runWorkflow({
          jobUrl: job.jobUrl,
          profilePath: options.profile,
          headless: options.headless,
          allowSubmit: options.confirmSubmit,
        });
        printWorkflowResult(result);
      }
    },
  );

program
  .command("resume")
  .description("Resume a failed or manually paused application from persisted state")
  .requiredOption("--id <application-id>", "Saved application ID")
  .requiredOption("--profile <path>", "Path to profile.local.json")
  .option("--headless", "Run without a visible browser", defaultHeadless())
  .option(
    "--confirm-submit",
    "Permit an action-time SUBMIT confirmation prompt when the final review screen is reached",
    false,
  )
  .action(
    async (options: { id: string; profile: string; headless: boolean; confirmSubmit: boolean }) => {
      const paths = resolveRuntimePaths();
      const repository = new ApplicationRepository(paths.applications);
      const record = await repository.get(options.id);
      if (!record) throw new Error(`Application ${options.id} was not found.`);

      const result = await runWorkflow({
        jobUrl: record.jobUrl,
        profilePath: options.profile,
        headless: options.headless,
        allowSubmit: options.confirmSubmit,
        recordId: options.id,
      });
      printWorkflowResult(result);
    },
  );

program
  .command("status")
  .description("Show persisted application status without opening a browser")
  .option("--json", "Print machine-readable JSON", false)
  .action(async ({ json }: { json: boolean }) => {
    const paths = resolveRuntimePaths();
    const records = await new ApplicationRepository(paths.applications).list();
    printApplicationStatus(records, json);
  });

program
  .command("demo:seed")
  .description("Create synthetic workflow records without opening a browser or contacting Indeed")
  .action(async () => {
    const paths = resolveRuntimePaths();
    const records = await seedDemoApplications(new ApplicationRepository(paths.demoApplications));
    console.log(`Seeded ${records.length} synthetic records at ${paths.demoApplications}.`);
    console.log("No browser was opened and no personal data was used.");
  });

program
  .command("demo:status")
  .description("Show the isolated synthetic workflow records")
  .option("--json", "Print machine-readable JSON", false)
  .action(async ({ json }: { json: boolean }) => {
    const paths = resolveRuntimePaths();
    const records = await new ApplicationRepository(paths.demoApplications).list();
    printApplicationStatus(records, json);
  });

program
  .command("demo:session")
  .description("Prove an encrypted remote-session round trip using synthetic data only")
  .action(async () => {
    const paths = resolveRuntimePaths();
    const result = await runSessionVaultDemo(paths.demoSessionVault);
    console.log("Encrypted remote-session acceptance demo:");
    console.log(`  Restored original synthetic browser state: ${result.restored ? "PASS" : "FAIL"}`);
    console.log(`  Plaintext cookie absent from vault file: ${result.plaintextAbsentFromVault ? "PASS" : "FAIL"}`);
    console.log(`  Stored encrypted envelope: ${result.storedEnvelopeBytes} bytes`);
    console.log(`  Vault artifact: ${result.vaultPath}`);
    if (!result.restored || !result.plaintextAbsentFromVault) {
      throw new Error("Encrypted remote-session acceptance demo failed.");
    }
  });

program
  .command("demo:workflow")
  .description("Run the real workflow against a fully intercepted synthetic Indeed-style fixture")
  .action(async () => {
    const result = await runWorkflowFixtureDemo();
    console.log("Synthetic end-to-end workflow acceptance demo:");
    console.log(`  Reached final review checkpoint: ${result.reachedFinalReview ? "PASS" : "FAIL"}`);
    console.log(`  Profile fields captured by next screen: ${result.profileFieldsCaptured ? "PASS" : "FAIL"}`);
    console.log(`  Exact radio/checkbox answers captured: ${result.exactAnswerCaptured ? "PASS" : "FAIL"}`);
    console.log(`  Synthetic resume attached: ${result.resumeAttached ? "PASS" : "FAIL"}`);
    console.log(`  Submit requests sent: ${result.submitRequestCount}`);
    console.log(`  Persisted transition events: ${result.historyLength}`);
    console.log(`  Record source: ${result.source}`);
    if (
      !result.reachedFinalReview ||
      !result.profileFieldsCaptured ||
      !result.exactAnswerCaptured ||
      !result.resumeAttached ||
      result.submitRequestCount !== 0 ||
      result.source !== "demo"
    ) {
      throw new Error("Synthetic end-to-end workflow acceptance demo failed.");
    }
  });

program
  .command("session-vault:serve")
  .description("Run the tenant-scoped encrypted session vault over HTTPS")
  .requiredOption("--user-id <id>", "Tenant ID bound to JOBNOVA_VAULT_TOKEN")
  .requiredOption("--cert <path>", "TLS certificate PEM path")
  .requiredOption("--key <path>", "TLS private-key PEM path")
  .option("--host <host>", "Listen host", "127.0.0.1")
  .option("--port <port>", "Listen port", parsePort, 9443)
  .option("--storage <path>", "Ciphertext-only storage directory", "runtime/session-vault")
  .action(
    async (options: {
      userId: string;
      cert: string;
      key: string;
      host: string;
      port: number;
      storage: string;
    }) => {
      const token = process.env.JOBNOVA_VAULT_TOKEN?.trim();
      if (!token) throw new Error("JOBNOVA_VAULT_TOKEN is required to start the session vault.");
      const vault = new EncryptedSessionVault({
        rootDirectory: options.storage,
        tenantTokens: { [options.userId]: token },
      });
      const server = createSessionVaultHttpsServer(vault, {
        cert: await readFile(options.cert),
        key: await readFile(options.key),
      });
      await new Promise<void>((resolveListen, rejectListen) => {
        server.once("error", rejectListen);
        server.listen(options.port, options.host, () => {
          server.off("error", rejectListen);
          resolveListen();
        });
      });
      console.log(
        `Encrypted session vault listening at https://${options.host}:${options.port}/v1/users/${options.userId}/indeed`,
      );
      console.log("The vault stores authenticated ciphertext envelopes only. Press Ctrl+C to stop.");
      await new Promise<void>((resolveClose) => {
        const shutdown = () => server.close(() => resolveClose());
        process.once("SIGINT", shutdown);
        process.once("SIGTERM", shutdown);
      });
    },
  );

try {
  await program.parseAsync(process.argv);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`JobNova CLI error: ${message}`);
  process.exitCode = 1;
}

interface RunWorkflowOptions {
  jobUrl: string;
  profilePath: string;
  headless: boolean;
  allowSubmit: boolean;
  recordId?: string;
}

async function runWorkflow(options: RunWorkflowOptions) {
  const paths = resolveRuntimePaths();
  const profile = await loadCandidateProfile(options.profilePath);
  await assertProfileReadyForLiveApplication(profile);
  const repository = new ApplicationRepository(paths.applications);
  const configuredSession = createConfiguredSessionStore(paths.session);
  const manager = createBrowserManager(configuredSession, paths.browserProfile, options.headless);
  const logger = new WorkflowLogger(paths.logs);
  const artifacts = new ArtifactStore(paths.artifacts);
  const workflow = new IndeedWorkflow(repository, manager, logger, artifacts);

  return workflow.run({
    jobUrl: options.jobUrl,
    profile,
    allowSubmit: options.allowSubmit,
    ...(options.recordId ? { recordId: options.recordId } : {}),
    ...(options.allowSubmit ? { confirmBeforeSubmit: confirmFinalSubmission } : {}),
  });
}

function createBrowserManager(
  configuredSession: ConfiguredSessionStore,
  browserProfile: string,
  headless: boolean,
): BrowserManager {
  return new BrowserManager(configuredSession.store, {
    headless,
    // A remote encrypted session is restored into an ephemeral context so a
    // second unencrypted persistent profile is not left behind on the worker.
    ...(configuredSession.kind === "local" ? { userDataDir: browserProfile } : {}),
    ...(process.env.JOBNOVA_CDP_URL ? { cdpUrl: process.env.JOBNOVA_CDP_URL } : {}),
  });
}

async function confirmFinalSubmission(): Promise<boolean> {
  const readline = createInterface({ input, output });
  try {
    console.warn(
      "The application is at the final Indeed submission step. Submitting will send your profile to the employer.",
    );
    const answer = await readline.question('Type exactly "SUBMIT" to send this application, or press Enter to pause: ');
    return answer === "SUBMIT";
  } finally {
    readline.close();
  }
}

function printWorkflowResult(result: Awaited<ReturnType<typeof runWorkflow>>): void {
  console.log(`Outcome: ${result.outcome}`);
  console.log(`Application ID: ${result.record.id}`);
  console.log(`Status: ${result.record.status}`);
  console.log(`Current step: ${result.record.currentStep}`);
  if (result.record.manualAction) {
    console.log(`Manual action: ${result.record.manualAction.message}`);
    if (result.record.manualAction.fields.length > 0) {
      console.log(`Fields requiring review: ${result.record.manualAction.fields.join(", ")}`);
    }
  }
  if (result.outcome === "duplicate") {
    console.log("Duplicate protection stopped this run. Use the saved record or resume command instead.");
  }
}

function printApplicationStatus(
  records: Awaited<ReturnType<ApplicationRepository["list"]>>,
  json: boolean,
): void {
  if (json) {
    console.log(JSON.stringify(records, null, 2));
    return;
  }

  if (records.length === 0) {
    console.log("No applications recorded yet.");
    return;
  }

  console.table(
    records.map((record) => ({
      id: record.id,
      source: record.source ?? "live",
      role: record.title ?? "Unknown role",
      company: record.company ?? "Unknown company",
      status: record.status,
      step: record.currentStep,
      attempts: record.attempts,
      updated: record.updatedAt,
    })),
  );
}

function parsePort(value: string): number {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("Port must be an integer from 1 to 65535.");
  }
  return port;
}
