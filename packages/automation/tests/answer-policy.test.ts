import { describe, expect, it } from "vitest";
import { resolveProfileAnswer } from "../src/profile/answer-policy.js";
import type { CandidateProfile } from "../src/profile/schema.js";

const profile: CandidateProfile = {
  identity: {
    firstName: "Candidate",
    lastName: "Example",
    email: "candidate@example.com",
    phone: "+1 555 555 0100",
  },
  location: { city: "Chapel Hill", state: "NC", country: "United States" },
  education: [],
  experience: [],
  workPreferences: {
    targetRoles: ["Software Engineer"],
    locations: ["North Carolina"],
    remote: true,
    employmentTypes: ["Full time"],
  },
  knownAnswers: {
    "Are you legally authorized to work in the United States?": "User-provided answer",
  },
};

describe("answer policy", () => {
  it("fills ordinary contact fields from the candidate profile", () => {
    expect(resolveProfileAnswer("Email address", profile)).toEqual({
      decision: "answer",
      value: "candidate@example.com",
      source: "profile",
    });
  });

  it("never guesses a sensitive legal answer", () => {
    expect(resolveProfileAnswer("Will you now or in the future require sponsorship?", profile)).toEqual({
      decision: "manual",
      reason: "sensitive_or_legal",
    });
  });

  it("uses an exact answer only when the candidate explicitly supplied it", () => {
    expect(resolveProfileAnswer("Are you legally authorized to work in the United States?", profile)).toEqual({
      decision: "answer",
      value: "User-provided answer",
      source: "explicit_known_answer",
    });
  });
});
