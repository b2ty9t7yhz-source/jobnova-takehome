import { describe, expect, it } from "vitest";
import { runWorkflowFixtureDemo } from "../src/demo/workflow-fixture-demo.js";

describe("synthetic end-to-end workflow", () => {
  it("fills a routed Indeed-style fixture and pauses before submit", async () => {
    const result = await runWorkflowFixtureDemo();

    expect(result).toMatchObject({
      reachedFinalReview: true,
      profileFieldsCaptured: true,
      exactAnswerCaptured: true,
      resumeAttached: true,
      submitRequestCount: 0,
      source: "demo",
    });
    expect(result.historyLength).toBeGreaterThanOrEqual(5);
  });
});
