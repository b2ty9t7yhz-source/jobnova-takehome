import { mkdir } from "node:fs/promises";
import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 1440, height: 1000 } });

test("desktop discovery flow reaches the review checkpoint", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.clear());
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Recommended jobs" })).toBeVisible();
  await page.getByRole("searchbox", { name: "Search recommended jobs" }).fill("research software");

  const card = page.getByTestId("job-card-research-software-engineer");
  await expect(card).toBeVisible();

  await page.getByRole("button", { name: "Filters" }).click();
  const filters = page.getByRole("dialog", { name: "Filters" });
  await filters.getByRole("button", { name: "Hybrid" }).click();
  await filters.getByRole("slider", { name: "Minimum match score" }).fill("80");
  await filters.getByRole("button", { name: "Show recommendations" }).click();
  await expect(card).toBeVisible();

  await card.getByRole("button", { name: "Save Research Software Engineer" }).click();
  await expect(page.getByRole("status")).toContainText("Saved to your shortlist");
  await page.getByRole("button", { name: "Show saved jobs" }).click();
  await expect(card).toBeVisible();

  await card.getByRole("button", { name: "View details" }).click();
  await expect(page.getByRole("heading", { name: "Research Software Engineer", level: 1 })).toBeVisible();
  await page.getByText("Recommendation receipt", { exact: true }).click();
  await expect(page.getByText("deterministic-weighted-v1", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Review application" }).click();
  await expect(page.getByRole("dialog", { name: "Review-before-submit workflow" })).toBeVisible();
  await expect(page.getByText("Submission is disabled in this demo.")).toBeVisible();

  await page.getByRole("button", { name: "Start safe demo" }).click();
  await expect(page.getByText("Pending", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Begin profile check" }).click();
  await expect(page.getByText("In progress", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Continue to verification gate" }).click();
  await expect(page.getByText("Manual action required", { exact: true })).toBeVisible();
  await expect(page.getByText(/does not solve a CAPTCHA/i)).toBeVisible();
  await page.getByRole("button", { name: "Acknowledge simulated verification" }).click();
  await expect(page.getByText("Final review reached", { exact: true })).toBeVisible();
  await expect(page.getByText(/Submit requests:/)).toContainText("0");

  await mkdir("artifacts/web-e2e", { recursive: true });
  await page.screenshot({
    path: "artifacts/web-e2e/desktop-review.png",
    animations: "disabled",
  });
});
