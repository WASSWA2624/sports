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
  const [sessionUser, setSessionUser] = useState(null);
  const [favoritesHydrated, setFavoritesHydrated] = useState(false);

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

  useEffect(() => {
    let active = true;

    async function hydrateFavorites() {
      try {
        const meResponse = await fetch("/api/auth/me", { credentials: "same-origin" });
        if (!meResponse.ok) {
          return;
        }

        const meJson = await meResponse.json();
        if (!active) {
          return;
        }

        setSessionUser(meJson.user);

        const favoritesResponse = await fetch("/api/favorites", {
          credentials: "same-origin",
        });
        if (!favoritesResponse.ok) {
          return;
        }

        const favoritesJson = await favoritesResponse.json();
        const remoteWatchlist = (favoritesJson.items || [])
          .map((item) => item.itemId)
          .filter(Boolean);
        const localOnly = (initialWatchlist || []).filter(
          (itemId) => !remoteWatchlist.includes(itemId)
        );

        if (localOnly.length) {
          await fetch("/api/favorites", {
            method: "POST",
            headers: { "content-type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({ itemIds: localOnly }),
          });
        }

        if (!active) {
          return;
        }

        setWatchlist([...new Set([...remoteWatchlist, ...localOnly])]);
      } finally {
        if (active) {
          setFavoritesHydrated(true);
        }
      }
    }

    hydrateFavorites();

    return () => {
      active = false;
    };
  }, [initialWatchlist]);

  async function toggleWatch(itemId) {
    const shouldSave = !watchlist.includes(itemId);

    setWatchlist((current) =>
      current.includes(itemId)
        ? current.filter((entry) => entry !== itemId)
        : [itemId, ...current].slice(0, 24)
    );

    if (!sessionUser) {
      return;
    }

    const response = await fetch(
      shouldSave
        ? "/api/favorites"
        : `/api/favorites?itemId=${encodeURIComponent(itemId)}`,
      {
        method: shouldSave ? "POST" : "DELETE",
        headers: shouldSave ? { "content-type": "application/json" } : undefined,
        credentials: "same-origin",
        body: shouldSave ? JSON.stringify({ itemId }) : undefined,
      }
    );

    if (response.ok) {
      return;
    }

    setWatchlist((current) =>
      shouldSave
        ? current.filter((entry) => entry !== itemId)
        : [itemId, ...current].slice(0, 24)
    );
  }

  const value = useMemo(
    () => ({
      locale: initialLocale,
      theme,
      setTheme: setThemeState,
      watchlist,
      watchlistCount: watchlist.length,
      favoritesHydrated,
      sessionUser,
      isWatched: (itemId) => watchlist.includes(itemId),
      toggleWatch,
    }),
    [favoritesHydrated, initialLocale, sessionUser, theme, watchlist]
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
