import { describe, expect, it } from "vitest";
import { detectManualGateText } from "../src/indeed/manual-gates.js";

describe("manual verification detection", () => {
  it.each([
    ["Please verify that you are human to continue", "captcha"],
    ["Just a moment... Additional Verification Required", "captcha"],
    ["We sent a code to your phone by text message", "sms_verification"],
    ["Check your email for a verification code", "email_verification"],
    ["Please verify this device", "device_verification"],
    ["Sign in to continue", "login_required"],
    ["Ready to take the next step? Create an account or sign in.", "login_required"],
  ])("classifies %s", (text, expectedKind) => {
    expect(detectManualGateText(text)?.kind).toBe(expectedKind);
  });

  it("does not treat an ordinary application page as verification", () => {
    expect(detectManualGateText("Review your work experience and continue")).toBeUndefined();
  });
});
