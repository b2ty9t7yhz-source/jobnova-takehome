import { describe, expect, it } from "vitest";
import { jobs } from "../data/jobs";
import { calculateMatch, filterJobs } from "./recommendation";

describe("recommendation scoring", () => {
  it("uses the documented deterministic weights", () => {
    expect(calculateMatch({ skills: 100, experience: 80, education: 60, preferences: 40 })).toBe(78);
  });

  it("filters by work mode, minimum score, and search text", () => {
    const results = filterJobs(
      jobs,
      "react",
      { workMode: "Remote", minimumMatch: 80 },
      false,
      new Set(),
    );

    expect(results.map((job) => job.id)).toEqual(["frontend-platform-intern"]);
  });

  it("limits saved view to the supplied shortlist", () => {
    const results = filterJobs(
      jobs,
      "",
      { workMode: "All", minimumMatch: 0 },
      true,
      new Set(["research-software-engineer"]),
    );

    expect(results).toHaveLength(1);
    expect(results[0]?.title).toBe("Research Software Engineer");
  });
});
