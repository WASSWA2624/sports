"use client";

import { createContext, useContext, useMemo, useEffect, useState } from "react";
import {
  DEFAULT_THEME,
  LOCALE_COOKIE_NAME,
  THEME_COOKIE_NAME,
  WATCHLIST_COOKIE_NAME,
  normalizeTheme,
  writeWatchlist,
} from "../../lib/coreui/preferences";

const PreferencesContext = createContext(null);

function setCookie(name, value) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=31536000; samesite=lax`;
}

function resolveTheme(theme) {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  return theme;
}

export function PreferencesProvider({ children, initialLocale, initialTheme, initialWatchlist }) {
  const [theme, setThemeState] = useState(normalizeTheme(initialTheme));
  const [watchlist, setWatchlist] = useState(initialWatchlist || []);

  useEffect(() => {
    const nextTheme = normalizeTheme(theme || DEFAULT_THEME);
    document.documentElement.dataset.theme = resolveTheme(nextTheme);
    document.documentElement.dataset.themePreference = nextTheme;
    window.localStorage.setItem(THEME_COOKIE_NAME, nextTheme);
    setCookie(THEME_COOKIE_NAME, nextTheme);
  }, [theme]);

  useEffect(() => {
    setCookie(LOCALE_COOKIE_NAME, initialLocale);
  }, [initialLocale]);

  useEffect(() => {
    const serialized = writeWatchlist(watchlist);
    window.localStorage.setItem(WATCHLIST_COOKIE_NAME, serialized);
    setCookie(WATCHLIST_COOKIE_NAME, serialized);
  }, [watchlist]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (theme === "system") {
        document.documentElement.dataset.theme = resolveTheme(theme);
      }
    };

    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, [theme]);

  const value = useMemo(
    () => ({
      locale: initialLocale,
      theme,
      setTheme: setThemeState,
      watchlist,
      watchlistCount: watchlist.length,
      isWatched: (itemId) => watchlist.includes(itemId),
      toggleWatch: (itemId) =>
        setWatchlist((current) =>
          current.includes(itemId)
            ? current.filter((entry) => entry !== itemId)
            : [itemId, ...current].slice(0, 24)
        ),
    }),
    [initialLocale, theme, watchlist]
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error("usePreferences must be used within PreferencesProvider.");
  }

  return context;
}
