import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { chromium, type Browser } from "playwright";
import { fillKnownApplicationFields } from "../src/indeed/field-filler.js";
import type { CandidateProfile } from "../src/profile/schema.js";

let browser: Browser;

beforeAll(async () => {
  browser = await chromium.launch({ headless: true });
});

afterAll(async () => {
  await browser.close();
});

const baseProfile: CandidateProfile = {
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
    "Preferred schedule": "Full time",
    "I confirm this synthetic form is for testing": true,
  },
};

describe("field filler in a real browser", () => {
  it("fills profile fields, exact radio/checkbox answers, and the labeled resume input", async () => {
    const directory = await mkdtemp(join(tmpdir(), "jobnova-field-filler-"));
    const resumePath = join(directory, "resume.pdf");
    await writeFile(resumePath, "%PDF-1.4 synthetic test fixture");
    const page = await browser.newPage();

    try {
      await page.setContent(`
        <form>
          <label>First name <input required /></label>
          <label>Last name <input required /></label>
          <label>Email address <input required type="email" /></label>
          <label>Phone number <input required /></label>
          <label>City <input required /></label>
          <label>State
            <select required><option value="">Choose</option><option>NC</option></select>
          </label>
          <label>Country
            <select required><option value="">Choose</option><option>United States</option></select>
          </label>
          <fieldset>
            <legend>Preferred schedule</legend>
            <label><input required type="radio" name="schedule" value="Full time" /> Full time</label>
            <label><input required type="radio" name="schedule" value="Part time" /> Part time</label>
          </fieldset>
          <label>
            <input required type="checkbox" /> I confirm this synthetic form is for testing
          </label>
          <label>Resume <input required type="file" name="resume" /></label>
        </form>
      `);

      const result = await fillKnownApplicationFields(page, { ...baseProfile, resumePath });

      expect(result.unresolvedRequiredFields).toEqual([]);
      expect(result.uploadedResume).toBe(true);
      expect(await page.locator("select").nth(0).inputValue()).toBe("NC");
      expect(await page.locator("select").nth(1).inputValue()).toBe("United States");
      expect(await page.locator('input[value="Full time"]').isChecked()).toBe(true);
      expect(await page.locator('input[type="checkbox"]').isChecked()).toBe(true);
      expect(
        await page.locator('input[type="file"]').evaluate((input: HTMLInputElement) => input.files?.[0]?.name),
      ).toBe("resume.pdf");
    } finally {
      await page.close();
      await rm(directory, { recursive: true });
    }
  });

  it("reports unresolved native and aria-required controls without duplicating a radio group", async () => {
    const page = await browser.newPage();
    try {
      await page.setContent(`
        <form>
          <label>Portfolio URL <input required /></label>
          <fieldset>
            <legend>Unknown required choice</legend>
            <label><input required type="radio" name="unknown" value="A" /> A</label>
            <label><input required type="radio" name="unknown" value="B" /> B</label>
          </fieldset>
          <div role="combobox" aria-required="true" aria-label="Portfolio type"></div>
        </form>
      `);

      const result = await fillKnownApplicationFields(page, baseProfile);

      expect(result.unresolvedRequiredFields).toEqual([
        "Portfolio URL",
        "Unknown required choice",
        "Portfolio type",
      ]);
    } finally {
      await page.close();
    }
  });
});
