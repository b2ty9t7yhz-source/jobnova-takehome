import { readFile } from "node:fs/promises";
import { z } from "zod";

const plannedJobSchema = z.object({
  jobUrl: z
    .url()
    .refine(isIndeedJobUrl, "jobUrl must be an HTTPS Indeed job URL with a jk identifier"),
  title: z.string().trim().min(2).max(160),
  company: z.string().trim().min(2).max(160),
  fitReason: z.string().trim().min(20).max(500),
});

export const jobPlanSchema = z.object({
  version: z.literal(1),
  jobs: z.array(plannedJobSchema).min(1).max(3),
});

export type JobPlan = z.infer<typeof jobPlanSchema>;

export async function loadJobPlan(path: string): Promise<JobPlan> {
  const raw: unknown = JSON.parse(await readFile(path, "utf8"));
  return jobPlanSchema.parse(raw);
}

function isIndeedJobUrl(value: string): boolean {
  const url = new URL(value);
  const hostname = url.hostname.toLocaleLowerCase();
  return (
    url.protocol === "https:" &&
    (hostname === "indeed.com" || hostname.endsWith(".indeed.com")) &&
    Boolean(url.searchParams.get("jk"))
  );
}
