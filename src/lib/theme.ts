export type Theme = "dark" | "light" | "system";
const STORAGE = "filemind:theme";

export function getTheme(): Theme {
  const t = localStorage.getItem(STORAGE);
  if (t === "light" || t === "dark" || t === "system") return t;
  return "dark";
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const resolved =
    theme === "system"
      ? window.matchMedia("(prefers-color-scheme: light)").matches
        ? "light"
        : "dark"
      : theme;
  root.setAttribute("data-theme", resolved);
}

export function setTheme(theme: Theme) {
  localStorage.setItem(STORAGE, theme);
  applyTheme(theme);
}

export function initThemeWatcher() {
  applyTheme(getTheme());
  const mq = window.matchMedia("(prefers-color-scheme: light)");
  mq.addEventListener("change", () => {
    if (getTheme() === "system") applyTheme("system");
  });
}
