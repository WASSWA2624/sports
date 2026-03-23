"use client";

import { createContext, useContext, useMemo, useEffect, useState, useCallback } from "react";
import { mergeAlertSettings } from "../../lib/alerts";
import {
  ALERT_SETTINGS_COOKIE_NAME,
  DEFAULT_THEME,
  FAVORITE_SPORTS_COOKIE_NAME,
  LOCALE_COOKIE_NAME,
  RECENT_VIEWS_COOKIE_NAME,
  THEME_COOKIE_NAME,
  WATCHLIST_COOKIE_NAME,
  WATCHLIST_LIMIT,
  writeFavoriteSports,
  writeAlertSettings,
  writeRecentViews,
  normalizeTheme,
  writeWatchlist,
} from "../../lib/coreui/preferences";
import { trackPersonalizationEvent } from "../../lib/personalization-analytics";
import { trackProductAnalyticsEvent } from "../../lib/product-analytics";

const PreferencesContext = createContext(null);
const DEFAULT_ALERT_PREFERENCES = {
  goals: true,
  cards: false,
  kickoff: true,
  periodChange: false,
  finalResult: true,
};

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

function normalizeFavoriteSportsInput(value) {
  return [...new Set(
    (Array.isArray(value) ? value : [value])
      .map((entry) => String(entry || "").trim().toLowerCase())
      .filter(Boolean)
  )].slice(0, 12);
}

function prependUniqueItems(items, additions, limit = WATCHLIST_LIMIT) {
  return [...new Set([...(additions || []), ...(items || [])])].slice(0, limit);
}

function buildDefaultProfilePreferences({
  locale,
  theme,
  favoriteSports,
}) {
  return {
    locale,
    theme,
    timezone: "UTC",
    favoriteSports: normalizeFavoriteSportsInput(favoriteSports),
    alertPreferences: DEFAULT_ALERT_PREFERENCES,
  };
}

export function PreferencesProvider({
  children,
  initialLocale,
  initialTheme,
  initialWatchlist,
  initialAlertSettings,
  initialRecentViews,
  initialFavoriteSports,
}) {
  const [theme, setThemeState] = useState(normalizeTheme(initialTheme));
  const [watchlist, setWatchlist] = useState(initialWatchlist || []);
  const [alertSettings, setAlertSettings] = useState(initialAlertSettings || {});
  const [recentViews, setRecentViews] = useState(initialRecentViews || []);
  const [favoriteSports, setFavoriteSportsState] = useState(
    normalizeFavoriteSportsInput(initialFavoriteSports || [])
  );
  const [sessionUser, setSessionUser] = useState(null);
  const [favoritesHydrated, setFavoritesHydrated] = useState(false);
  const [profilePreferences, setProfilePreferences] = useState(() =>
    buildDefaultProfilePreferences({
      locale: initialLocale,
      theme: normalizeTheme(initialTheme),
      favoriteSports: initialFavoriteSports,
    })
  );

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
    const serialized = writeFavoriteSports(favoriteSports);
    window.localStorage.setItem(FAVORITE_SPORTS_COOKIE_NAME, serialized);
    setCookie(FAVORITE_SPORTS_COOKIE_NAME, serialized);
  }, [favoriteSports]);

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

        const [favoritesResponse, alertsResponse, profilePreferencesResponse] = await Promise.all([
          fetch("/api/favorites", {
            credentials: "same-origin",
          }),
          fetch("/api/alerts", {
            credentials: "same-origin",
          }),
          fetch("/api/profile/preferences", {
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
        const remoteProfilePreferences = profilePreferencesResponse.ok
          ? await profilePreferencesResponse.json()
          : buildDefaultProfilePreferences({
              locale: initialLocale,
              theme: normalizeTheme(initialTheme),
              favoriteSports: initialFavoriteSports,
            });
        const localAlertItems = Object.entries(initialAlertSettings || {}).map(
          ([itemId, notificationTypes]) => ({
            itemId,
            notificationTypes,
          })
        );
        const mergedFavoriteSports = normalizeFavoriteSportsInput([
          ...(initialFavoriteSports || []),
          ...(remoteProfilePreferences.favoriteSports || []),
        ]);

        if (localAlertItems.length) {
          await fetch("/api/alerts", {
            method: "POST",
            headers: { "content-type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({ items: localAlertItems }),
          });
        }

        const remoteFavoriteSports = normalizeFavoriteSportsInput(
          remoteProfilePreferences.favoriteSports || []
        );
        const missingFavoriteSports = mergedFavoriteSports.filter(
          (sport) => !remoteFavoriteSports.includes(sport)
        );

        if (missingFavoriteSports.length) {
          await fetch("/api/profile/preferences", {
            method: "PUT",
            headers: { "content-type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({
              ...remoteProfilePreferences,
              favoriteSports: mergedFavoriteSports,
            }),
          }).catch(() => {});
        }

        if (!active) {
          return;
        }

        setWatchlist([...new Set([...remoteWatchlist, ...localOnly])]);
        setAlertSettings(mergeAlertSettings(remoteAlertSettings, initialAlertSettings || {}));
        setFavoriteSportsState(mergedFavoriteSports);
        setProfilePreferences({
          ...buildDefaultProfilePreferences({
            locale: initialLocale,
            theme: normalizeTheme(initialTheme),
            favoriteSports: mergedFavoriteSports,
          }),
          ...remoteProfilePreferences,
          favoriteSports: mergedFavoriteSports,
        });
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
  }, [initialAlertSettings, initialFavoriteSports, initialLocale, initialTheme, initialWatchlist]);

  const persistProfilePreferences = useCallback(
    async (nextProfilePreferences) => {
      setProfilePreferences(nextProfilePreferences);

      if (!sessionUser) {
        return true;
      }

      const response = await fetch("/api/profile/preferences", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(nextProfilePreferences),
      }).catch(() => null);

      return Boolean(response?.ok);
    },
    [sessionUser]
  );

  const toggleWatch = useCallback(async (itemId, options = {}) => {
    const shouldSave = !watchlist.includes(itemId);
    const nextWatchlist = shouldSave
      ? prependUniqueItem(watchlist, itemId)
      : watchlist.filter((entry) => entry !== itemId);

    setWatchlist(nextWatchlist);

    trackProductAnalyticsEvent({
      event: "favorites_depth_changed",
      surface: options.surface || "app",
      entityId: itemId,
      metadata: {
        action: shouldSave ? "add" : "remove",
        count: nextWatchlist.length,
        authenticated: Boolean(sessionUser),
      },
    });

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

  const addFavoriteItems = useCallback(
    async (itemIds = [], options = {}) => {
      const additions = [...new Set((itemIds || []).filter(Boolean))].filter(
        (itemId) => !watchlist.includes(itemId)
      );

      if (!additions.length) {
        return;
      }

      const nextWatchlist = prependUniqueItems(watchlist, additions);
      setWatchlist(nextWatchlist);

      trackProductAnalyticsEvent({
        event: "favorites_depth_changed",
        surface: options.surface || "app",
        metadata: {
          action: "batch_add",
          count: nextWatchlist.length,
          delta: additions.length,
          authenticated: Boolean(sessionUser),
        },
      });

      if (!sessionUser) {
        return;
      }

      const response = await fetch("/api/favorites", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ itemIds: additions }),
      }).catch(() => null);

      if (response?.ok) {
        return;
      }

      setWatchlist(watchlist);
    },
    [sessionUser, watchlist]
  );

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

  const saveFavoriteSports = useCallback(
    async (sports, options = {}) => {
      const normalizedSports = normalizeFavoriteSportsInput(sports);
      const previousFavoriteSports = favoriteSports;
      const previousProfilePreferences = profilePreferences;
      const nextProfilePreferences = {
        ...profilePreferences,
        favoriteSports: normalizedSports,
      };

      setFavoriteSportsState(normalizedSports);
      setProfilePreferences(nextProfilePreferences);

      const persisted = await persistProfilePreferences(nextProfilePreferences);
      if (persisted) {
        return true;
      }

      setFavoriteSportsState(previousFavoriteSports);
      setProfilePreferences(previousProfilePreferences);

      if (options.silent) {
        return false;
      }

      return false;
    },
    [favoriteSports, persistProfilePreferences, profilePreferences]
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
      favoriteSports,
      favoritesHydrated,
      sessionUser,
      isWatched: (itemId) => watchlist.includes(itemId),
      isFavorite: (itemId) => watchlist.includes(itemId),
      getAlertTypes: (itemId) => alertSettings[itemId] || [],
      hasAlertType: (itemId, notificationType) =>
        (alertSettings[itemId] || []).includes(notificationType),
      toggleWatch,
      toggleFavorite: toggleWatch,
      addFavoriteItems,
      toggleAlertType,
      recordView,
      setFavoriteSports: saveFavoriteSports,
    }),
    [
      addFavoriteItems,
      alertSettings,
      favoriteSports,
      favoritesHydrated,
      initialLocale,
      recentViews,
      recordView,
      saveFavoriteSports,
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
