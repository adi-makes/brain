import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!window.localStorage.getItem("second-brain-theme")) {
      window.localStorage.setItem("second-brain-theme", "light");
    }
  });
});

async function openWorkspace(page: Page) {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
}

test("navigates between the workspace and settings", async ({ page }) => {
  await openWorkspace(page);
  await page.getByRole("link", { name: "Settings" }).first().click();
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  await page.getByRole("link", { name: "Workspace", exact: true }).click();
  await expect(page.getByRole("region", { name: "Calendar" })).toBeVisible();
});

test("persists the theme choice", async ({ page }) => {
  await page.goto("/settings");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  await page.getByRole("radio", { name: "Dark" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.getByRole("radio", { name: "Light" }).click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
});

test("adds a task in the current tab after validation", async ({ page }) => {
  await openWorkspace(page);
  await page.getByRole("button", { name: "Add" }).click();
  await page.getByRole("button", { name: "Add in this tab" }).click();
  await expect(page.getByText("Add a title.")).toBeVisible();
  await page.getByLabel("Title").fill("Fold the linen");
  await page.getByRole("button", { name: "Add in this tab" }).click();
  await expect(page.locator("#todo").getByText("Fold the linen")).toBeVisible();
  await expect(page.getByText("Development fixtures.")).toBeVisible();
});

test("changes calendar view and moves the selected day with the keyboard", async ({ page }) => {
  await openWorkspace(page);
  await page.getByRole("radio", { name: "Month" }).click();
  await expect(page.getByRole("radio", { name: "Month" })).toHaveAttribute("aria-checked", "true");
  await page.getByRole("radio", { name: "Day" }).click();
  const calendar = page.getByLabel(/day calendar/i);
  const heading = page.getByRole("region", { name: "Calendar" }).getByRole("heading");
  const before = await heading.innerText();
  await calendar.focus();
  await page.keyboard.press("ArrowRight");
  await expect(heading).not.toHaveText(before);
});

test("filters the to-do list", async ({ page }) => {
  await openWorkspace(page);
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(page.locator("#todo").getByText("Water the fig")).toBeVisible();
  await page.getByRole("button", { name: "Open", exact: true }).first().click();
  await expect(page.locator("#todo").getByText("Draft the November note")).toBeVisible();
});

test("opens search from the keyboard and reports no results", async ({ page }) => {
  await openWorkspace(page);
  await page.keyboard.press("Control+k");
  await page.getByLabel("Search development fixtures").fill("zz-no-match");
  await expect(page.getByText(/No fixture matches/)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByLabel("Search development fixtures")).toHaveCount(0);
});

test("has no serious axe violations on the workspace and settings", async ({ page }) => {
  await openWorkspace(page);
  const workspace = await new AxeBuilder({ page }).analyze();
  expect(
    workspace.violations.filter((item) => item.impact === "serious" || item.impact === "critical"),
  ).toEqual([]);
  await page.goto("/settings");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const settings = await new AxeBuilder({ page }).analyze();
  expect(
    settings.violations.filter((item) => item.impact === "serious" || item.impact === "critical"),
  ).toEqual([]);
});

test("shows the unconfigured sign-in state without a session", async ({ page }) => {
  await page.goto("/sign-in");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  const configured = await page.getByLabel("Email").count();
  const unconfigured = await page.getByText("Supabase is not configured.").count();
  expect(configured + unconfigured).toBeGreaterThan(0);
});

test.describe("narrow navigation", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("uses the bottom navigation", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
    const nav = page.getByRole("navigation", { name: "Workspace" });
    await expect(nav).toBeVisible();
    await nav.getByRole("link", { name: "Settings" }).click();
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  });
});
