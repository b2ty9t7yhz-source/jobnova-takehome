import { describe, expect, it } from "vitest";
import { advanceDemoApplication, createDemoApplication, isDemoApplication } from "./demo-workflow";

describe("public safe demo workflow", () => {
  it("moves through a verification pause to final review without submitting", () => {
    const created = createDemoApplication({
      id: "00000000-0000-4000-8000-000000000001",
      jobId: "research-software-engineer",
      role: "Research Software Engineer",
      company: "Lattice Lab",
      now: "2026-08-23T20:00:00.000Z",
      expiresAt: "2026-08-24T20:00:00.000Z",
    });

    const started = advanceDemoApplication(created, "2026-08-23T20:00:01.000Z");
    const paused = advanceDemoApplication(started, "2026-08-23T20:00:02.000Z");
    const reviewed = advanceDemoApplication(paused, "2026-08-23T20:00:03.000Z");

    expect(created).toMatchObject({ status: "pending", step: "created", submitRequests: 0 });
    expect(started).toMatchObject({ status: "in_progress", step: "profile_filling", attempts: 1 });
    expect(paused).toMatchObject({
      status: "manual_action_required",
      step: "awaiting_manual_action",
      manualAction: { kind: "verification_required" },
    });
    expect(reviewed).toMatchObject({
      status: "manual_action_required",
      step: "awaiting_review",
      attempts: 2,
      submitRequests: 0,
      manualAction: { kind: "final_review" },
    });
    expect(reviewed.events.map((event) => event.reason)).toEqual([
      "safe_demo_created",
      "workflow_started",
      "verification_required",
      "manual_verification_acknowledged",
      "final_review",
    ]);
  });

  it("recognizes only complete public demo records", () => {
    const record = createDemoApplication({
      id: "00000000-0000-4000-8000-000000000002",
      jobId: "frontend-platform-intern",
      role: "Frontend Platform Engineer Intern",
      company: "Northstar AI",
      now: "2026-08-23T20:00:00.000Z",
      expiresAt: "2026-08-24T20:00:00.000Z",
    });

    expect(isDemoApplication(record)).toBe(true);
    expect(isDemoApplication({ ...record, submitRequests: 1 })).toBe(false);
    expect(isDemoApplication({ ...record, source: "live" })).toBe(false);
  });
});
