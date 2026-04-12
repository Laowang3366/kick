export type ThemePreference = "light" | "dark" | "system";

function isDarkSystemTheme() {
  return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false;
}

export function normalizeThemePreference(value: unknown): ThemePreference {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "dark") return "dark";
  if (normalized === "system") return "system";
  return "light";
}

export function applyThemePreference(value: unknown) {
  if (typeof document === "undefined") return;
  const preference = normalizeThemePreference(value);
  const resolvedTheme = preference === "system"
    ? (isDarkSystemTheme() ? "dark" : "light")
    : preference;

  const root = document.documentElement;
  root.classList.toggle("dark", resolvedTheme === "dark");
  root.dataset.theme = resolvedTheme;
  root.style.colorScheme = resolvedTheme;
}
