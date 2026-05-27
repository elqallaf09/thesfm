"use client";

import { useEffect } from "react";
import {
  ThemeProvider as NextThemesProvider,
  ThemeProviderProps,
  useTheme,
} from "next-themes";

type SfmTheme = "light" | "dark" | "system";

function normalizeTheme(value: unknown): SfmTheme | null {
  return value === "light" || value === "dark" || value === "system" ? value : null;
}

function getStoredPreferenceTheme(): SfmTheme | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("sfm_settings");
    if (!raw) return null;
    return normalizeTheme(JSON.parse(raw)?.theme);
  } catch {
    return null;
  }
}

function ThemeStorageBridge({ storageKey }: { storageKey: string }) {
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const preferred =
      normalizeTheme(window.localStorage.getItem(storageKey)) ||
      normalizeTheme(window.localStorage.getItem("theme")) ||
      getStoredPreferenceTheme();

    if (!preferred) return;
    if (window.localStorage.getItem(storageKey) !== preferred) {
      window.localStorage.setItem(storageKey, preferred);
    }
    if (preferred !== theme) setTheme(preferred);
  }, [setTheme, storageKey, theme]);

  return null;
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const storageKey = props.storageKey || "the-sfm-theme";

  return (
    <NextThemesProvider {...props} storageKey={storageKey}>
      <ThemeStorageBridge storageKey={storageKey} />
      {children}
    </NextThemesProvider>
  );
}
