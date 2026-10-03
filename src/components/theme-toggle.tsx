"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon, type IconName } from "@/components/icon";

/**
 * The theme control.
 *
 * Three states, not two: **system** is the default and stays the default until
 * the reader makes a choice, so the site honours the operating system the way
 * the stylesheet already does. Cycling is intentional — one control, no menu,
 * no settings screen for a single preference.
 *
 * There is no flash on load because the choice is applied by a blocking script
 * in the document head (see `layout.tsx`), which runs before first paint. This
 * component only *reads* that decision back so it can label itself correctly,
 * which is why the first client render is deliberately identical to the
 * server's: nothing about the preference is guessed during hydration.
 */

type Preference = "system" | "light" | "dark";

export const THEME_KEY = "edu-share-theme";

const ORDER: readonly Preference[] = ["system", "light", "dark"];

const LABEL: Record<Preference, string> = {
  system: "System",
  light: "Light",
  dark: "Dark",
};

const ICON: Record<Preference, IconName> = {
  system: "monitor",
  light: "sun",
  dark: "moon",
};

/** The preference the head script already applied, or "system" if it could not. */
function currentPreference(): Preference {
  try {
    const stored = window.localStorage.getItem(THEME_KEY);
    return stored === "light" || stored === "dark" ? stored : "system";
  } catch {
    return "system";
  }
}

function resolve(preference: Preference): "light" | "dark" {
  if (preference !== "system") return preference;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function apply(preference: Preference): void {
  const root = document.documentElement;
  root.setAttribute("data-theme", resolve(preference));
  root.setAttribute("data-theme-pref", preference);
}

export function ThemeToggle() {
  const [preference, setPreference] = useState<Preference>("system");

  useEffect(() => {
    setPreference(currentPreference());
  }, []);

  // While the preference is "system", follow the operating system live.
  useEffect(() => {
    if (preference !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (): void => apply("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [preference]);

  const cycle = useCallback(() => {
    setPreference((previous) => {
      const next = ORDER[(ORDER.indexOf(previous) + 1) % ORDER.length] ?? "system";
      try {
        if (next === "system") window.localStorage.removeItem(THEME_KEY);
        else window.localStorage.setItem(THEME_KEY, next);
      } catch {
        // A browser that refuses storage still gets the theme for this page:
        // the attribute is set either way, it simply will not persist.
      }
      apply(next);
      return next;
    });
  }, []);

  return (
    <button
      type="button"
      className="themebtn"
      onClick={cycle}
      aria-label={`Colour theme: ${LABEL[preference]}. Change theme.`}
      title={`Colour theme: ${LABEL[preference]}`}
      data-theme-pref={preference}
    >
      <Icon name={ICON[preference]} size={16} />
      <span className="themebtn__label">{LABEL[preference]}</span>
    </button>
  );
}
