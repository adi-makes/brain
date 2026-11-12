import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("shows an overdue preview, dismisses it from the keyboard, and restores it", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  await page.getByLabel("Workspace state").selectOption("overdue");
  await expect(page.getByText("Preview. Nothing is saved.")).toBeVisible();
  const dismiss = page.getByRole("button", { name: "Dismiss Pay the invoice" });
  await dismiss.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#today").getByText("Pay the invoice")).toHaveCount(0);
  await expect(page.locator("#todo").getByText("Dismissed")).toBeVisible();
  const restore = page.getByRole("button", { name: "Restore Pay the invoice" });
  await restore.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#today").getByText("Overdue", { exact: true })).toBeVisible();
});

test("shows dense and empty projection previews", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  await page.getByLabel("Workspace state").selectOption("dense");
  await expect(page.locator("#today").getByText("Due today")).toBeVisible();
  await expect(page.locator("#upcoming").getByText("Due soon")).toBeVisible();
  await expect(page.locator("#today").getByText("Manually pinned")).toBeVisible();
  await expect(page.locator("#todo").getByText("No due date")).toBeVisible();
  await page.getByLabel("Workspace state").selectOption("empty");
  await expect(page.locator("#today").getByText("Nothing is surfaced for today.")).toBeVisible();
  await expect(page.locator("#upcoming").getByText("Nothing is due soon.")).toBeVisible();
});

test("has no serious axe violations on the overdue preview", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  await page.getByLabel("Workspace state").selectOption("overdue");
  const result = await new AxeBuilder({ page }).analyze();
  expect(
    result.violations.filter((violation) =>
      ["serious", "critical"].includes(violation.impact ?? ""),
    ),
  ).toEqual([]);
});
