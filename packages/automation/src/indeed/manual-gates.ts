import type { Page } from "playwright";
import type { ManualActionKind } from "../domain/application.js";

export interface DetectedManualGate {
  kind: Exclude<
    ManualActionKind,
    | "unknown_question"
    | "external_application"
    | "final_review"
    | "unsupported_step"
    | "submission_unconfirmed"
  >;
  message: string;
}

const gatePatterns: Array<{ kind: DetectedManualGate["kind"]; pattern: RegExp; message: string }> = [
  {
    kind: "captcha",
    pattern:
      /captcha|verify (that )?you('re| are) (a )?human|security check|additional verification required|just a moment|cloudflare|turnstile/i,
    message: "Complete the CAPTCHA or human verification in the open browser.",
  },
  {
    kind: "sms_verification",
    pattern: /text message|sms code|code (sent|we sent) to (your )?(phone|mobile)/i,
    message: "Enter the SMS verification code in the open browser.",
  },
  {
    kind: "email_verification",
    pattern: /check your email|email verification|code (sent|we sent) to (your )?email/i,
    message: "Complete the email verification in the open browser.",
  },
  {
    kind: "device_verification",
    pattern: /verify (this|your) device|unrecognized device|confirm it('s| is) you/i,
    message: "Complete the device verification in the open browser.",
  },
  {
    kind: "login_required",
    pattern:
      /sign in to (continue|apply)|log in to (continue|apply)|create an account or sign in|secure\.indeed\.com\/auth|from=bot-detection-anonymous/i,
    message: "Sign in to your own Indeed account, then resume this application.",
  },
];

export function detectManualGateText(text: string, url = ""): DetectedManualGate | undefined {
  const haystack = `${url}\n${text}`.slice(0, 40_000);
  return gatePatterns.find(({ pattern }) => pattern.test(haystack));
}

export async function detectManualGate(page: Page): Promise<DetectedManualGate | undefined> {
  const title = await page.title().catch(() => "");
  const bodyText = await page.locator("body").innerText({ timeout: 5_000 }).catch(() => "");
  return detectManualGateText(`${title}\n${bodyText}`, page.url());
}
