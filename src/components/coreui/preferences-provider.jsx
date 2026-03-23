"use client";

import { createContext, useContext, useMemo, useEffect, useState, useCallback } from "react";
import { mergeAlertSettings } from "../../lib/alerts";
import {
  ALERT_SETTINGS_COOKIE_NAME,
  DEFAULT_THEME,
  LOCALE_COOKIE_NAME,
  RECENT_VIEWS_COOKIE_NAME,
  THEME_COOKIE_NAME,
  WATCHLIST_COOKIE_NAME,
  WATCHLIST_LIMIT,
  writeAlertSettings,
  writeRecentViews,
  normalizeTheme,
  writeWatchlist,
} from "../../lib/coreui/preferences";
import { trackPersonalizationEvent } from "../../lib/personalization-analytics";

const PreferencesContext = createContext(null);

function setCookie(name, value) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=31536000; samesite=lax`;
}

function prependUniqueItem(items, itemId, limit = WATCHLIST_LIMIT) {
  return [itemId, ...items.filter((entry) => entry !== itemId)].slice(0, limit);
}

function toggleAlertSetting(current, itemId, notificationType, enabled) {
  const existing = current[itemId] || [];
  const next = enabled
    ? [...new Set([...existing, notificationType])]
    : existing.filter((entry) => entry !== notificationType);

  if (!next.length) {
    const rest = { ...current };
    delete rest[itemId];
    return rest;
  }

  return {
    ...current,
    [itemId]: next,
  };
}

function resolveTheme(theme) {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  return theme;
}

export function PreferencesProvider({
  children,
  initialLocale,
  initialTheme,
  initialWatchlist,
  initialAlertSettings,
  initialRecentViews,
}) {
  const [theme, setThemeState] = useState(normalizeTheme(initialTheme));
  const [watchlist, setWatchlist] = useState(initialWatchlist || []);
  const [alertSettings, setAlertSettings] = useState(initialAlertSettings || {});
  const [recentViews, setRecentViews] = useState(initialRecentViews || []);
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
    const serialized = writeAlertSettings(alertSettings);
    window.localStorage.setItem(ALERT_SETTINGS_COOKIE_NAME, serialized);
    setCookie(ALERT_SETTINGS_COOKIE_NAME, serialized);
  }, [alertSettings]);

  useEffect(() => {
    const serialized = writeRecentViews(recentViews);
    window.localStorage.setItem(RECENT_VIEWS_COOKIE_NAME, serialized);
    setCookie(RECENT_VIEWS_COOKIE_NAME, serialized);
  }, [recentViews]);

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

        const [favoritesResponse, alertsResponse] = await Promise.all([
          fetch("/api/favorites", {
            credentials: "same-origin",
          }),
          fetch("/api/alerts", {
            credentials: "same-origin",
          }),
        ]);

        if (!favoritesResponse.ok) {
          return;
        }

        const favoritesJson = await favoritesResponse.json();
        const remoteWatchlist = (favoritesJson.items || [])
          .map((item) => item.itemId)
          .filter(Boolean);
        const localOnly = (initialWatchlist || []).filter((itemId) => !remoteWatchlist.includes(itemId));

        if (localOnly.length) {
          await fetch("/api/favorites", {
            method: "POST",
            headers: { "content-type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({ itemIds: localOnly }),
          });
        }

        const remoteAlertSettings = alertsResponse.ok
          ? (await alertsResponse.json()).settings || {}
          : {};
        const localAlertItems = Object.entries(initialAlertSettings || {}).map(
          ([itemId, notificationTypes]) => ({
            itemId,
            notificationTypes,
          })
        );

        if (localAlertItems.length) {
          await fetch("/api/alerts", {
            method: "POST",
            headers: { "content-type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({ items: localAlertItems }),
          });
        }

        if (!active) {
          return;
        }

        setWatchlist([...new Set([...remoteWatchlist, ...localOnly])]);
        setAlertSettings(mergeAlertSettings(remoteAlertSettings, initialAlertSettings || {}));
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
  }, [initialAlertSettings, initialWatchlist]);

  const toggleWatch = useCallback(async (itemId, options = {}) => {
    const shouldSave = !watchlist.includes(itemId);
    const nextWatchlist = shouldSave
      ? prependUniqueItem(watchlist, itemId)
      : watchlist.filter((entry) => entry !== itemId);

    setWatchlist(nextWatchlist);

    if (shouldSave) {
      trackPersonalizationEvent({
        event: "favorite_created",
        surface: options.surface || "app",
        itemId,
        metadata: {
          authenticated: Boolean(sessionUser),
          label: options.label || null,
        },
      });
    }

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
        body: shouldSave
          ? JSON.stringify({
              itemId,
              label: options.label,
              metadata: options.metadata,
            })
          : undefined,
      }
    );

    if (response.ok) {
      return;
    }

    setWatchlist(watchlist);
  }, [sessionUser, watchlist]);

  const toggleAlertType = useCallback(
    async (itemId, notificationType, enabled, options = {}) => {
      const currentTypes = alertSettings[itemId] || [];
      const shouldEnable =
        typeof enabled === "boolean" ? enabled : !currentTypes.includes(notificationType);
      const nextAlertSettings = toggleAlertSetting(
        alertSettings,
        itemId,
        notificationType,
        shouldEnable
      );
      const shouldAutoFavorite = shouldEnable && !watchlist.includes(itemId);
      const nextWatchlist = shouldAutoFavorite
        ? prependUniqueItem(watchlist, itemId)
        : watchlist;

      setAlertSettings(nextAlertSettings);

      if (shouldAutoFavorite) {
        setWatchlist(nextWatchlist);
      }

      if (shouldEnable) {
        trackPersonalizationEvent({
          event: "alert_opt_in",
          surface: options.surface || "app",
          itemId,
          notificationType,
          metadata: {
            authenticated: Boolean(sessionUser),
            label: options.label || null,
          },
        });
      }

      if (!sessionUser) {
        return;
      }

      const requests = [];

      if (shouldAutoFavorite) {
        requests.push(
          fetch("/api/favorites", {
            method: "POST",
            headers: { "content-type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({
              itemId,
              label: options.label,
              metadata: options.metadata,
            }),
          })
        );
      }

      requests.push(
        fetch(
          shouldEnable
            ? "/api/alerts"
            : `/api/alerts?itemId=${encodeURIComponent(itemId)}&notificationType=${encodeURIComponent(notificationType)}`,
          {
            method: shouldEnable ? "POST" : "DELETE",
            headers: shouldEnable ? { "content-type": "application/json" } : undefined,
            credentials: "same-origin",
            body: shouldEnable
              ? JSON.stringify({
                  itemId,
                  notificationType,
                })
              : undefined,
          }
        )
      );

      const responses = await Promise.all(requests);

      if (responses.every((response) => response.ok)) {
        return;
      }

      setAlertSettings(alertSettings);

      if (shouldAutoFavorite) {
        setWatchlist(watchlist);
      }
    },
    [alertSettings, sessionUser, watchlist]
  );

  const recordView = useCallback(
    async (itemId, options = {}) => {
      setRecentViews((current) => prependUniqueItem(current, itemId, 20));

      if (!sessionUser) {
        return;
      }

      await fetch("/api/recent-views", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          itemId,
          label: options.label,
          metadata: options.metadata,
        }),
      }).catch(() => {});
    },
    [sessionUser]
  );

  const value = useMemo(
    () => ({
      locale: initialLocale,
      theme,
      setTheme: setThemeState,
      watchlist,
      watchlistCount: watchlist.length,
      favoritesCount: watchlist.length,
      alertSettings,
      alertCount: Object.values(alertSettings).reduce((count, entry) => count + entry.length, 0),
      recentViews,
      favoritesHydrated,
      sessionUser,
      isWatched: (itemId) => watchlist.includes(itemId),
      isFavorite: (itemId) => watchlist.includes(itemId),
      getAlertTypes: (itemId) => alertSettings[itemId] || [],
      hasAlertType: (itemId, notificationType) =>
        (alertSettings[itemId] || []).includes(notificationType),
      toggleWatch,
      toggleFavorite: toggleWatch,
      toggleAlertType,
      recordView,
    }),
    [
      alertSettings,
      favoritesHydrated,
      initialLocale,
      recentViews,
      recordView,
      sessionUser,
      theme,
      toggleAlertType,
      toggleWatch,
      watchlist,
    ]
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
