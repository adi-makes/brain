import { expect, test } from "@playwright/test";

const widths = [
  { name: "360x800", width: 360, height: 800 },
  { name: "390x844", width: 390, height: 844 },
  { name: "430x932", width: 430, height: 932 },
  { name: "768x1024", width: 768, height: 1024 },
  { name: "1366x768", width: 1366, height: 768 },
  { name: "1440x900", width: 1440, height: 900 },
  { name: "1920x1080", width: 1920, height: 1080 },
];

test.describe("visual capture", () => {
  test.skip(process.env.VISUAL !== "1", "Set VISUAL=1 to capture screenshots.");

  for (const viewport of widths) {
    for (const theme of ["light", "dark"] as const) {
      test(`${viewport.name} ${theme}`, async ({ page }) => {
        const consoleErrors: string[] = [];
        page.on("pageerror", (error) => consoleErrors.push(error.message));
        page.on("console", (message) => {
          if (message.type() === "error") consoleErrors.push(message.text());
        });
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.addInitScript((choice) => {
          window.localStorage.setItem("second-brain-theme", choice);
        }, theme);
        await page.goto("/");
        await expect(page.getByRole("region", { name: "Calendar" })).toBeVisible();
        const overflows = await page.evaluate(
          () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        );
        expect(overflows).toBe(false);
        await page.screenshot({
          path: `../../artifacts/screenshots/01-design-system/${viewport.name}-${theme}-workspace.png`,
          fullPage: false,
        });
        if (viewport.name === "1440x900") {
          await page.getByRole("radio", { name: "Month" }).click();
          await page.screenshot({
            path: `../../artifacts/screenshots/01-design-system/${viewport.name}-${theme}-month.png`,
          });
          await page.getByRole("button", { name: "Add" }).click();
          await expect(page.getByRole("dialog", { name: "Quick add" })).toBeVisible();
          await page.screenshot({
            path: `../../artifacts/screenshots/01-design-system/${viewport.name}-${theme}-quick-add.png`,
          });
          await page.keyboard.press("Escape");
          await page.getByRole("button", { name: "Assistant" }).click();
          await expect(page.getByRole("heading", { name: "Assistant", exact: true })).toBeVisible();
          await page.screenshot({
            path: `../../artifacts/screenshots/01-design-system/${viewport.name}-${theme}-assistant.png`,
          });
          await page.getByRole("button", { name: "Close" }).click();
          await page.getByLabel("Workspace state").selectOption("empty");
          await page.screenshot({
            path: `../../artifacts/screenshots/01-design-system/${viewport.name}-${theme}-empty.png`,
          });
          await page.getByLabel("Workspace state").selectOption("error");
          await page.screenshot({
            path: `../../artifacts/screenshots/01-design-system/${viewport.name}-${theme}-error.png`,
          });
          await page.goto("/settings");
          await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
          await page.screenshot({
            path: `../../artifacts/screenshots/01-design-system/${viewport.name}-${theme}-settings.png`,
          });
        }
        expect(consoleErrors).toEqual([]);
      });
    }
  }
});

test.describe("auto surface panels", () => {
  test.skip(process.env.VISUAL !== "1", "Set VISUAL=1 to capture screenshots.");

  for (const viewport of widths) {
    for (const theme of ["light", "dark"] as const) {
      for (const state of ["empty", "dense", "overdue"] as const) {
        test(`${viewport.name} ${theme} ${state}`, async ({ page }) => {
          await page.setViewportSize({ width: viewport.width, height: viewport.height });
          await page.addInitScript((choice) => {
            window.localStorage.setItem("second-brain-theme", choice);
          }, theme);
          await page.goto("/");
          await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
          await page.getByLabel("Workspace state").selectOption(state);
          await expect(page.locator("#today")).toBeVisible();
          const overflows = await page.evaluate(
            () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
          );
          expect(overflows).toBe(false);
          await page.screenshot({
            path: `../../artifacts/screenshots/04-auto-surface/${viewport.name}-${theme}-${state}.png`,
            fullPage: false,
          });
        });
      }
    }
  }
});
