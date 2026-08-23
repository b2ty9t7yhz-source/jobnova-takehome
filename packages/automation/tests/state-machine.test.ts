import { describe, expect, it } from "vitest";
import type { ApplicationRecord } from "../src/domain/application.js";
import {
  InvalidStatusTransitionError,
  transitionApplication,
} from "../src/domain/state-machine.js";

const baseRecord: ApplicationRecord = {
  id: "app-1",
  jobKey: "indeed:abc",
  jobUrl: "https://www.indeed.com/viewjob?jk=abc",
  status: "pending",
  currentStep: "created",
  createdAt: "2026-08-18T12:00:00.000Z",
  updatedAt: "2026-08-18T12:00:00.000Z",
  attempts: 0,
  history: [],
};

describe("application state machine", () => {
  it("records a valid transition and increments workflow attempts", () => {
    const result = transitionApplication(
      baseRecord,
      "in_progress",
      "job_opened",
      "workflow_started",
      "2026-08-18T12:01:00.000Z",
    );

    expect(result.status).toBe("in_progress");
    expect(result.attempts).toBe(1);
    expect(result.history).toEqual([
      {
        at: "2026-08-18T12:01:00.000Z",
        from: "pending",
        to: "in_progress",
        step: "job_opened",
        reason: "workflow_started",
      },
    ]);
  });

  it("rejects a direct pending to submitted transition", () => {
    expect(() => transitionApplication(baseRecord, "submitted", "complete", "invalid")).toThrow(
      InvalidStatusTransitionError,
    );
  });

  it("supports pause and resume without losing history", () => {
    const started = transitionApplication(baseRecord, "in_progress", "job_opened", "start");
    const paused: ApplicationRecord = {
      ...transitionApplication(
        started,
        "manual_action_required",
        "awaiting_manual_action",
        "captcha",
      ),
      manualAction: {
        kind: "captcha",
        message: "Complete the challenge manually.",
        detectedAt: "2026-08-18T12:02:00.000Z",
        fields: [],
      },
    };
    const resumed = transitionApplication(paused, "in_progress", "job_opened", "resume");

    expect(resumed.attempts).toBe(2);
    expect(resumed.history).toHaveLength(3);
    expect(resumed.manualAction).toBeUndefined();
  });
});
