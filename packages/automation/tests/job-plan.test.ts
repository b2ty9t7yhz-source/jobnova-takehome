import { describe, expect, it } from "vitest";
import { jobPlanSchema } from "../src/profile/job-plan.js";

const suitableJob = {
  jobUrl: "https://www.indeed.com/viewjob?jk=verified-job-id",
  title: "Research Software Engineer",
  company: "Example Research Lab",
  fitReason: "The candidate reviewed the role against education, portfolio evidence, and location preferences.",
};

describe("bounded job plan", () => {
  it("accepts one to three candidate-reviewed Indeed jobs", () => {
    const plan = jobPlanSchema.parse({ version: 1, jobs: [suitableJob] });
    expect(plan.jobs).toHaveLength(1);
  });

  it("rejects external sites and high-volume plans", () => {
    expect(() =>
      jobPlanSchema.parse({
        version: 1,
        jobs: [{ ...suitableJob, jobUrl: "https://example.com/jobs/1" }],
      }),
    ).toThrow();

    expect(() =>
      jobPlanSchema.parse({
        version: 1,
        jobs: Array.from({ length: 4 }, (_, index) => ({
          ...suitableJob,
          jobUrl: `https://www.indeed.com/viewjob?jk=verified-job-${index}`,
        })),
      }),
    ).toThrow();
  });
});
