"use client";

import { useState } from "react";
import type { Density, ThemeChoice, WeekStart } from "../demo/types";
import { useWorkspace } from "../workspace/store";
import { FormSkeleton, ProfileSkeleton, SettingsSkeleton } from "./skeletons";

const THEMES: { id: ThemeChoice; label: string }[] = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "system", label: "System" },
];

export function SettingsPanel() {
  const { preferencesReady, preview } = useWorkspace();
  if (!preferencesReady || preview === "loading") return <SettingsSkeleton />;
  return <SettingsForm />;
}

function SettingsForm() {
  const {
    theme,
    setTheme,
    displayName,
    setDisplayName,
    weekStartsOn,
    setWeekStartsOn,
    density,
    setDensity,
    preview,
  } = useWorkspace();
  const [draftName, setDraftName] = useState(displayName);
  const [savedNote, setSavedNote] = useState("");

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-6">
      <h1 className="text-2xl font-medium tracking-tight text-ink">Settings</h1>
      <p className="mt-2 text-sm text-muted">
        Theme, name, and calendar preferences stay in this browser. Nothing here is an account.
      </p>

      <section className="mt-8 border-t border-line pt-6" aria-labelledby="profile-heading">
        <h2 id="profile-heading" className="text-sm font-medium text-ink">
          Appearance of your name
        </h2>
        {preview === "empty" ? (
          <div className="mt-4">
            <ProfileSkeleton />
            <p className="mt-3 text-sm text-muted">
              No profile fixture is loaded in the empty preview.
            </p>
          </div>
        ) : (
          <form
            className="mt-4 space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              const next = draftName.trim();
              if (!next) {
                setSavedNote("A display name is required.");
                return;
              }
              setDisplayName(next);
              setSavedNote("Saved in this browser only.");
            }}
          >
            <label className="block text-sm text-ink" htmlFor="display-name">
              Display name
            </label>
            <input
              id="display-name"
              name="display-name"
              autoComplete="off"
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              className="min-h-11 w-full rounded-[10px] border border-line bg-surface px-3 text-sm"
            />
            <button
              type="submit"
              className="cursor-pointer min-h-11 rounded-[10px] bg-accent px-4 text-sm text-canvas"
            >
              Keep name on this browser
            </button>
            {savedNote ? (
              <p className="text-sm text-muted" role="status">
                {savedNote}
              </p>
            ) : null}
          </form>
        )}
      </section>

      <section className="mt-8 border-t border-line pt-6" aria-labelledby="theme-heading">
        <h2 id="theme-heading" className="text-sm font-medium text-ink">
          Theme
        </h2>
        <div
          className="mt-3 flex flex-wrap gap-2"
          role="radiogroup"
          aria-labelledby="theme-heading"
        >
          {THEMES.map((option) => (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={theme === option.id}
              onClick={() => setTheme(option.id)}
              className={`cursor-pointer min-h-11 rounded-[10px] border px-4 text-sm ${
                theme === option.id
                  ? "border-accent bg-accent-soft text-ink"
                  : "border-line text-muted"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-8 border-t border-line pt-6" aria-labelledby="prefs-heading">
        <h2 id="prefs-heading" className="text-sm font-medium text-ink">
          Calendar preferences
        </h2>
        <div className="mt-4 space-y-4">
          <fieldset>
            <legend className="text-sm text-ink">Week starts</legend>
            <div className="mt-2 flex gap-2">
              {(
                [
                  [1, "Monday"],
                  [0, "Sunday"],
                ] as const
              ).map(([value, label]) => (
                <label key={value} className="cursor-pointer">
                  <input
                    className="peer sr-only"
                    type="radio"
                    name="week-start"
                    checked={weekStartsOn === value}
                    onChange={() => setWeekStartsOn(value as WeekStart)}
                  />
                  <span className="inline-flex min-h-11 items-center rounded-[10px] border border-line px-3 text-sm peer-checked:border-accent peer-checked:bg-accent-soft">
                    {label}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="text-sm text-ink">Density</legend>
            <div className="mt-2 flex gap-2">
              {(["comfortable", "compact"] as Density[]).map((value) => (
                <label key={value} className="cursor-pointer">
                  <input
                    className="peer sr-only"
                    type="radio"
                    name="density"
                    checked={density === value}
                    onChange={() => setDensity(value)}
                  />
                  <span className="inline-flex min-h-11 items-center rounded-[10px] border border-line px-3 text-sm capitalize peer-checked:border-accent peer-checked:bg-accent-soft">
                    {value}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
        {preview === "error" ? (
          <div className="mt-6">
            <FormSkeleton />
            <p role="alert" className="mt-2 text-sm text-ink">
              Preference form preview failed. Existing choices above still work locally.
            </p>
          </div>
        ) : null}
      </section>
    </main>
  );
}
