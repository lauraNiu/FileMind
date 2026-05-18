import { useEffect } from "react";
import type { NavigateFunction } from "react-router-dom";

export interface ShortcutContext {
  nav: NavigateFunction;
  openCommandPalette: () => void;
  newChat?: () => void;
}

const NAV_KEYS: Record<string, string> = {
  "1": "/",
  "2": "/projects",
  "3": "/files",
  "4": "/timeline",
  "5": "/graph",
  "6": "/chat",
  "7": "/history",
};

export function useGlobalShortcuts(ctx: ShortcutContext) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;

      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      if (e.key === "p" || e.key === "P") {
        if (isInput && !e.shiftKey) return;
        e.preventDefault();
        ctx.openCommandPalette();
        return;
      }

      if (e.key === "k" || e.key === "K") {
        if (isInput) return;
        e.preventDefault();
        ctx.openCommandPalette();
        return;
      }

      if (NAV_KEYS[e.key]) {
        if (isInput) return;
        e.preventDefault();
        ctx.nav(NAV_KEYS[e.key]);
      }

      if ((e.key === "n" || e.key === "N") && ctx.newChat) {
        if (isInput) return;
        e.preventDefault();
        ctx.newChat();
      }

      if (e.key === "," ) {
        if (isInput) return;
        e.preventDefault();
        ctx.nav("/settings");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ctx]);
}
