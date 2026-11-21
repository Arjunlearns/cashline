// theme helpers: stored and system theme, class toggling, change hook, calm-mode flag
import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

const THEME_KEY = "cashline-theme";
const CALM_KEY = "cashline-calm";
const CHANGE_EVENT = "cashline-theme-change";

/** The theme the user explicitly chose, or null if none is stored (or storage is blocked). */
export function getStoredTheme(): Theme | null {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === "light" || v === "dark" ? v : null;
  } catch {
    return null;
  }
}

/** The OS colour-scheme preference; defaults to light if it cannot be read. */
export function systemTheme(): Theme {
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  } catch {
    return "light";
  }
}

/** Toggles the .dark class on <html>. */
export function applyTheme(t: Theme): void {
  const root = document.documentElement;
  root.classList.toggle("dark", t === "dark");
  root.style.colorScheme = t;
}

/** Reads the theme currently applied to the document. */
export function currentTheme(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

/** Applies the theme, stores it, and notifies listeners. */
export function setTheme(t: Theme): void {
  applyTheme(t);
  try {
    localStorage.setItem(THEME_KEY, t);
  } catch {
    // storage blocked: the theme still applies for this page load
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Current theme plus a toggle; re-renders when the theme changes anywhere. */
export function useTheme(): { theme: Theme; toggle: () => void } {
  const [theme, setThemeState] = useState<Theme>(currentTheme);

  useEffect(() => {
    const sync = () => setThemeState(currentTheme());
    window.addEventListener(CHANGE_EVENT, sync);
    return () => window.removeEventListener(CHANGE_EVENT, sync);
  }, []);

  const toggle = () => setTheme(currentTheme() === "dark" ? "light" : "dark");
  return { theme, toggle };
}

/** True when calm mode is stored ("cashline-calm" = "1") or the URL has ?still=1. */
export function getCalm(): boolean {
  let stored = false;
  try {
    stored = localStorage.getItem(CALM_KEY) === "1";
  } catch {
    stored = false;
  }
  let still = false;
  try {
    still = new URLSearchParams(window.location.search).get("still") === "1";
  } catch {
    still = false;
  }
  return stored || still;
}

/** Stores the calm-mode flag in "cashline-calm" (blocked storage is ignored). */
export function setCalm(b: boolean): void {
  try {
    localStorage.setItem(CALM_KEY, b ? "1" : "0");
  } catch {
    // storage blocked: nothing to persist
  }
}
