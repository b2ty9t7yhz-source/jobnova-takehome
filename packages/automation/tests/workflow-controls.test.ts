import { describe, expect, it } from "vitest";
import { INDEED_APPLY_LABEL } from "../src/indeed/workflow.js";

describe("Indeed workflow controls", () => {
  it.each(["Apply now", "Easily apply", "Apply on Indeed", "Apply with Indeed"])(
    "recognizes %s as an Indeed-hosted application control",
    (label) => {
      expect(INDEED_APPLY_LABEL.test(label)).toBe(true);
    },
  );

  it("does not treat a generic employer-site link as an Indeed apply control", () => {
    expect(INDEED_APPLY_LABEL.test("Apply on company site")).toBe(false);
  });
});
