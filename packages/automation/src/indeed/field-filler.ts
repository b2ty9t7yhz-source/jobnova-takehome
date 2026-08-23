import { access } from "node:fs/promises";
import type { Locator, Page } from "playwright";
import { resolveProfileAnswer } from "../profile/answer-policy.js";
import type { CandidateProfile } from "../profile/schema.js";

export interface FillResult {
  filledFields: string[];
  uploadedResume: boolean;
  unresolvedRequiredFields: string[];
}

export async function fillKnownApplicationFields(
  page: Page,
  profile: CandidateProfile,
): Promise<FillResult> {
  const filledFields: string[] = [];

  const directFields: Array<{ label: RegExp; value: string; name: string }> = [
    { label: /first name/i, value: profile.identity.firstName, name: "first_name" },
    { label: /last name/i, value: profile.identity.lastName, name: "last_name" },
    { label: /email/i, value: profile.identity.email, name: "email" },
    { label: /(phone|mobile)/i, value: profile.identity.phone, name: "phone" },
    { label: /^city$/i, value: profile.location.city, name: "city" },
    { label: /^(state|province)$/i, value: profile.location.state, name: "state" },
    { label: /^country$/i, value: profile.location.country, name: "country" },
  ];

  for (const field of directFields) {
    const locator = await firstVisible([
      page.getByLabel(field.label),
      page.getByPlaceholder(field.label),
    ]);
    if (!locator) continue;
    if (await fillControlValue(page, locator, field.value)) filledFields.push(field.name);
  }

  for (const [question, rawAnswer] of Object.entries(profile.knownAnswers)) {
    if (await fillQuestion(page, question, String(rawAnswer))) {
      filledFields.push(`known_answer:${question}`);
    }
  }

  let uploadedResume = false;
  if (profile.resumePath) {
    await access(profile.resumePath);
    const fileInput = await findResumeInput(page);
    if (fileInput) {
      await fileInput.setInputFiles(profile.resumePath);
      uploadedResume = true;
    }
  }

  const initiallyUnresolved = await inspectUnresolvedRequiredFields(page);
  for (const label of initiallyUnresolved) {
    const resolution = resolveProfileAnswer(label, profile);
    if (resolution.decision !== "answer") continue;
    if (await fillQuestion(page, label, resolution.value)) {
      filledFields.push(`${resolution.source}:${label}`);
    }
  }

  // Re-read the DOM after every attempted fill. A value is considered resolved
  // only when the page itself now reports it as complete.
  const unresolvedRequiredFields = await inspectUnresolvedRequiredFields(page);

  return { filledFields, uploadedResume, unresolvedRequiredFields };
}

async function inspectUnresolvedRequiredFields(page: Page): Promise<string[]> {
  return page
    .locator('input[required], textarea[required], select[required], [aria-required="true"]')
    .evaluateAll((elements) => {
      const unresolved = new Set<string>();

      for (const element of elements) {
        if (!(element instanceof HTMLElement) || element.getAttribute("aria-disabled") === "true") continue;
        if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) {
          if (element.disabled) continue;
        }

        const control = element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
        const nativeLabels = Array.from(control.labels ?? []).map((item) => {
          const copy = item.cloneNode(true) as HTMLElement;
          copy.querySelectorAll("input, select, textarea, button").forEach((child) => child.remove());
          return copy.textContent?.replace(/\s+/g, " ").trim() ?? "";
        });
        const nativeLabel = nativeLabels.find(Boolean);
        const legend = element
          .closest("fieldset")
          ?.querySelector("legend")
          ?.textContent?.replace(/\s+/g, " ")
          .trim();
        const label =
          legend ??
          nativeLabel ??
          element.getAttribute("aria-label") ??
          element.getAttribute("name") ??
          element.id ??
          "Unknown required field";

        if (element instanceof HTMLInputElement) {
          if (["hidden", "submit", "button"].includes(element.type)) continue;
          if (element.type === "radio") {
            const group = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="radio"]')).filter(
              (candidate) => candidate.name === element.name,
            );
            if (group.some((candidate) => candidate.checked) || group[0] !== element) continue;
            unresolved.add(label);
            continue;
          }
          if (element.type === "checkbox") {
            if (!element.checked) unresolved.add(label);
            continue;
          }
          if (element.type === "file") {
            if (!element.files?.length) unresolved.add(label);
            continue;
          }
          if (!element.value.trim()) unresolved.add(label);
          continue;
        }

        if (element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) {
          if (!element.value.trim()) unresolved.add(label);
          continue;
        }

        const role = element.getAttribute("role");
        const hasSelectedOption = Boolean(element.querySelector('[aria-selected="true"], [data-selected="true"]'));
        const exposedValue = element.getAttribute("aria-valuetext") ?? element.getAttribute("data-value") ?? "";
        if ((role === "combobox" || role === "listbox") && !hasSelectedOption && !exposedValue.trim()) {
          unresolved.add(label);
        }
      }

      return [...unresolved];
    });
}

async function fillQuestion(page: Page, question: string, answer: string): Promise<boolean> {
  const questionPattern = new RegExp(escapeRegExp(question), "i");
  const direct = await firstVisible([
    page.getByLabel(questionPattern),
    page.getByRole("textbox", { name: questionPattern }),
    page.getByRole("combobox", { name: questionPattern }),
  ]);
  if (direct && (await fillControlValue(page, direct, answer))) return true;

  const group = await firstVisible([
    page.getByRole("group", { name: questionPattern }),
    page.locator("fieldset").filter({ hasText: question }),
  ]);
  if (!group) return false;

  const answerPattern = new RegExp(`^\\s*${escapeRegExp(answer)}\\s*$`, "i");
  const choice = await firstVisible([
    group.getByRole("radio", { name: answerPattern }),
    group.getByRole("checkbox", { name: answerPattern }),
    group.getByRole("button", { name: answerPattern }),
  ]);
  if (choice) {
    const type = (await choice.getAttribute("type"))?.toLocaleLowerCase();
    if (type === "radio" || type === "checkbox") await choice.setChecked(true);
    else await choice.click();
    return true;
  }

  const select = await firstVisible([group.locator("select"), group.getByRole("combobox")]);
  return select ? fillControlValue(page, select, answer) : false;
}

async function fillControlValue(page: Page, locator: Locator, answer: string): Promise<boolean> {
  const tagName = await locator.evaluate((element) => element.tagName.toLocaleLowerCase());
  const type = (await locator.getAttribute("type"))?.toLocaleLowerCase();
  const role = (await locator.getAttribute("role"))?.toLocaleLowerCase();

  if (tagName === "select") {
    await locator.selectOption({ label: answer }).catch(() => locator.selectOption(answer));
    return true;
  }
  if (type === "checkbox") {
    await locator.setChecked(parseBooleanAnswer(answer));
    return true;
  }
  if (tagName === "input" || tagName === "textarea") {
    if (type === "radio") return false;
    const currentValue = await locator.inputValue().catch(() => "");
    if (currentValue.trim()) return true;
    await locator.fill(answer);
    return true;
  }
  if (role === "combobox") {
    await locator.click();
    const option = await firstVisible([
      page.getByRole("option", { name: new RegExp(`^\\s*${escapeRegExp(answer)}\\s*$`, "i") }),
    ]);
    if (!option) return false;
    await option.click();
    return true;
  }
  return false;
}

async function findResumeInput(page: Page): Promise<Locator | undefined> {
  const inputs = page.locator('input[type="file"]');
  const count = await inputs.count();
  if (count === 0) return undefined;

  for (let index = 0; index < count; index += 1) {
    const candidate = inputs.nth(index);
    const descriptor = await candidate.evaluate((element) => {
      const input = element as HTMLInputElement;
      return [
        ...Array.from(input.labels ?? []).map((label) => label.textContent ?? ""),
        input.getAttribute("aria-label") ?? "",
        input.name,
        input.id,
      ].join(" ");
    });
    if (/resume|cv/i.test(descriptor)) return candidate;
  }
  return count === 1 ? inputs.first() : undefined;
}

function parseBooleanAnswer(answer: string): boolean {
  if (/^(true|yes|y|1)$/i.test(answer.trim())) return true;
  if (/^(false|no|n|0)$/i.test(answer.trim())) return false;
  throw new Error(`Checkbox answer must be yes/no or true/false, received: ${answer}`);
}

async function firstVisible(locators: Locator[]): Promise<Locator | undefined> {
  for (const candidate of locators) {
    const count = await candidate.count();
    for (let index = 0; index < count; index += 1) {
      const locator = candidate.nth(index);
      if (await locator.isVisible().catch(() => false)) return locator;
    }
  }
  return undefined;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
