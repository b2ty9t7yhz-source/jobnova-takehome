import { mkdir } from "node:fs/promises";
import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

test("mobile discovery stays responsive through detail and review", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.clear());
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Recommended jobs" })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.getByRole("searchbox", { name: "Search recommended jobs" }).fill("frontend platform");
  await page.getByRole("button", { name: "Filters" }).click();
  const filters = page.getByRole("dialog", { name: "Filters" });
  await filters.getByRole("button", { name: "Remote" }).click();
  await filters.getByRole("slider", { name: "Minimum match score" }).fill("80");
  await filters.getByRole("button", { name: "Show recommendations" }).click();

  const card = page.getByTestId("job-card-frontend-platform-intern");
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "Save Frontend Platform Engineer Intern" }).click();

  const mobileNav = page.getByRole("navigation", { name: "Mobile navigation" });
  await mobileNav.getByRole("button", { name: "Saved" }).click();
  await expect(card).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await card.getByRole("button", { name: "View details" }).click();
  await expect(page.getByRole("heading", { name: "Frontend Platform Engineer Intern", level: 1 })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.getByRole("button", { name: "Review application" }).click();
  await expect(page.getByRole("dialog", { name: "Review-before-submit workflow" })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await mkdir("artifacts/web-e2e", { recursive: true });
  await page.screenshot({
    path: "artifacts/web-e2e/mobile-review.png",
    animations: "disabled",
  });
});

async function expectNoHorizontalOverflow(page: import("@playwright/test").Page) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
}
