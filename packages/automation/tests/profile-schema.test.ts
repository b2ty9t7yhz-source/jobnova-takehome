import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertProfileReadyForLiveApplication,
  loadCandidateProfile,
  type CandidateProfile,
} from "../src/profile/schema.js";

describe("candidate profile schema", () => {
  it("keeps the committed example structurally valid", async () => {
    const profile = await loadCandidateProfile(resolve("data/profile.example.json"));
    expect(profile.identity.email).toBe("you@example.com");
    expect(profile.resumePath).toMatch(/resume\.local\.pdf$/);
  });

  it("rejects the committed placeholder profile for live use", async () => {
    const profile = await loadCandidateProfile(resolve("data/profile.example.json"));
    await expect(assertProfileReadyForLiveApplication(profile)).rejects.toThrow("not ready for a live application");
  });

  it("accepts a complete profile with a readable resume", async () => {
    const directory = await mkdtemp(join(tmpdir(), "jobnova-profile-"));
    const resumePath = join(directory, "resume.pdf");
    await writeFile(resumePath, "%PDF-1.4 synthetic profile fixture");
    const profile: CandidateProfile = {
      identity: {
        firstName: "Candidate",
        lastName: "Person",
        email: "candidate@school.edu",
        phone: "+1 919 123 4567",
      },
      location: { city: "Chapel Hill", state: "NC", country: "United States" },
      resumePath,
      education: [{ school: "University", degree: "BS", field: "Computer Science", graduation: "2027-05" }],
      experience: [
        {
          organization: "Research Lab",
          title: "Software Assistant",
          startDate: "2025-01",
          endDate: "Present",
          summary: "Built and validated reproducible software tools.",
        },
      ],
      workPreferences: {
        targetRoles: ["Software Engineer"],
        locations: ["North Carolina"],
        remote: true,
        employmentTypes: ["Full time"],
      },
      knownAnswers: {},
    };

    try {
      await expect(assertProfileReadyForLiveApplication(profile)).resolves.toBeUndefined();
    } finally {
      await rm(directory, { recursive: true });
    }
  });
});
