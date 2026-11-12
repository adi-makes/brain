import type { ThemeChoice } from "../demo/types";

export const THEME_KEY = "second-brain-theme";
export const NAME_KEY = "second-brain-display-name";
export const WEEK_START_KEY = "second-brain-week-start";
export const DENSITY_KEY = "second-brain-density";

export function resolveTheme(choice: ThemeChoice, prefersDark: boolean): "light" | "dark" {
  if (choice === "system") return prefersDark ? "dark" : "light";
  return choice;
}

export function isThemeChoice(value: string | null): value is ThemeChoice {
  return value === "light" || value === "dark" || value === "system";
}
