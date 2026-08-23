import type { ApplicationRecord } from "../domain/application.js";
import type { ApplicationRepository } from "../storage/application-repository.js";

interface DemoScenario {
  jobId: string;
  title: string;
  company: string;
  advance: (repository: ApplicationRepository, record: ApplicationRecord) => Promise<void>;
}

const scenarios: DemoScenario[] = [
  {
    jobId: "jobnova-demo-pending",
    title: "Demo: Research Software Engineer shortlist",
    company: "Northstar Demo Lab",
    advance: async () => undefined,
  },
  {
    jobId: "jobnova-demo-in-progress",
    title: "Demo: Reproducibility Platform Intern",
    company: "Provenance Demo Works",
    advance: async (repository, record) => {
      await repository.transition(record.id, "in_progress", "profile_filling", "demo_workflow_started");
    },
  },
  {
    jobId: "jobnova-demo-manual",
    title: "Demo: Scientific Data Engineer verification",
    company: "Traceable Data Demo",
    advance: async (repository, record) => {
      await repository.transition(record.id, "in_progress", "job_opened", "demo_workflow_started");
      await repository.pause(record.id, {
        kind: "captcha",
        message: "Synthetic checkpoint: manual verification would be required here.",
        fields: [],
        detectedAt: new Date().toISOString(),
      });
    },
  },
  {
    jobId: "jobnova-demo-failed",
    title: "Demo: Frontend Quality Engineer recovery",
    company: "Accessible UI Demo",
    advance: async (repository, record) => {
      await repository.transition(record.id, "in_progress", "job_opened", "demo_workflow_started");
      await repository.fail(record.id, {
        message: "Synthetic failure used to demonstrate recovery and observability.",
        failedAt: new Date().toISOString(),
        step: "profile_filling",
        url: record.jobUrl,
      });
    },
  },
  {
    jobId: "jobnova-demo-submitted",
    title: "Demo fixture: Full-stack workflow complete",
    company: "JobNova Synthetic Employer",
    advance: async (repository, record) => {
      await repository.transition(record.id, "in_progress", "submitting", "demo_workflow_started");
      await repository.transition(record.id, "submitted", "complete", "demo_submission_confirmed");
    },
  },
];

export async function seedDemoApplications(
  repository: ApplicationRepository,
): Promise<ApplicationRecord[]> {
  for (const scenario of scenarios) {
    const { record, created } = await repository.createOrGet({
      jobUrl: `https://www.indeed.com/viewjob?jk=${scenario.jobId}`,
      title: scenario.title,
      company: scenario.company,
      source: "demo",
    });

    if (created) await scenario.advance(repository, record);
  }

  return repository.list();
}
