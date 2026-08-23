import { access, readFile } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";
import { z } from "zod";

const educationSchema = z.object({
  school: z.string().min(1),
  degree: z.string().min(1),
  field: z.string().min(1),
  graduation: z.string().min(4),
});

const experienceSchema = z.object({
  organization: z.string().min(1),
  title: z.string().min(1),
  startDate: z.string().min(4),
  endDate: z.string().min(4),
  summary: z.string().min(1),
});

export const candidateProfileSchema = z.object({
  identity: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(7),
  }),
  location: z.object({
    city: z.string().min(1),
    state: z.string().min(1),
    country: z.string().min(1),
  }),
  resumePath: z.string().min(1).optional(),
  education: z.array(educationSchema).default([]),
  experience: z.array(experienceSchema).default([]),
  workPreferences: z.object({
    targetRoles: z.array(z.string()).min(1),
    locations: z.array(z.string()).default([]),
    remote: z.boolean(),
    employmentTypes: z.array(z.string()).min(1),
  }),
  knownAnswers: z.record(z.string(), z.union([z.string(), z.boolean()])).default({}),
});

export type CandidateProfile = z.infer<typeof candidateProfileSchema>;

export async function loadCandidateProfile(filePath: string): Promise<CandidateProfile> {
  const absolutePath = resolve(filePath);
  const parsed: unknown = JSON.parse(await readFile(absolutePath, "utf8"));
  const profile = candidateProfileSchema.parse(parsed);

  if (profile.resumePath && !isAbsolute(profile.resumePath)) {
    return { ...profile, resumePath: resolve(dirname(absolutePath), profile.resumePath) };
  }

  return profile;
}

export async function assertProfileReadyForLiveApplication(profile: CandidateProfile): Promise<void> {
  const issues: string[] = [];
  const placeholderValues = [
    profile.identity.firstName,
    profile.identity.lastName,
    profile.location.city,
    profile.location.state,
  ];
  if (placeholderValues.some((value) => /^(your|replace|example)\b/i.test(value.trim()))) {
    issues.push("replace every identity and location placeholder");
  }
  if (/@example\.(com|test)$/i.test(profile.identity.email)) {
    issues.push("use the candidate's verified email address");
  }
  if (/\b555[\s-]*555\b/.test(profile.identity.phone)) {
    issues.push("use the candidate's verified phone number");
  }
  if (profile.education.length === 0) issues.push("include at least one education record");
  if (profile.experience.length === 0) issues.push("include at least one experience record");
  if (!profile.resumePath) {
    issues.push("configure a resumePath");
  } else if (!(await access(profile.resumePath).then(() => true).catch(() => false))) {
    issues.push("make resumePath point to a readable local file");
  }

  if (issues.length > 0) {
    throw new Error(`Candidate profile is not ready for a live application: ${issues.join("; ")}.`);
  }
}
