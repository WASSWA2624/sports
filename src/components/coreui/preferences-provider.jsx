"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { mergeAlertSettings } from "../../lib/alerts";
import {
  ALERT_SETTINGS_COOKIE_NAME,
  FAVORITE_SPORTS_COOKIE_NAME,
  LOCALE_COOKIE_NAME,
  MARKET_PREFERENCES_COOKIE_NAME,
  ONBOARDING_STATE_COOKIE_NAME,
  PROMPT_PREFERENCES_COOKIE_NAME,
  RECENT_VIEWS_COOKIE_NAME,
  THEME_COOKIE_NAME,
  TIMEZONE_COOKIE_NAME,
  WATCHLIST_COOKIE_NAME,
  WATCHLIST_LIMIT,
  writeAlertSettings,
  writeFavoriteSports,
  writeMarketPreferences,
  writeOnboardingState,
  writePromptPreferences,
  writeRecentViews,
  writeTimezone,
  writeWatchlist,
} from "../../lib/coreui/preferences";
import { GEO_COOKIE_NAME } from "../../lib/coreui/route-context";
import {
  DEFAULT_ONBOARDING_STATE,
  DEFAULT_PROFILE_PREFERENCES,
  getProfileComplianceSnapshot,
  mergeProfilePreferences,
  normalizeProfilePreferences,
} from "../../lib/profile-preferences";
import { trackPersonalizationEvent } from "../../lib/personalization-analytics";
import { trackProductAnalyticsEvent } from "../../lib/product-analytics";

const PreferencesContext = createContext(null);

function setCookie(name, value) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=31536000; samesite=lax`;
}

function prependUniqueItem(items, itemId, limit = WATCHLIST_LIMIT) {
  return [itemId, ...items.filter((entry) => entry !== itemId)].slice(0, limit);
}

function prependUniqueItems(items, additions, limit = WATCHLIST_LIMIT) {
  return [...new Set([...(additions || []), ...(items || [])])].slice(0, limit);
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

function areEquivalentPreferences(left, right, fallbackGeo) {
  return (
    JSON.stringify(normalizeProfilePreferences(left, { fallbackGeo })) ===
    JSON.stringify(normalizeProfilePreferences(right, { fallbackGeo }))
  );
}

function buildInitialProfilePreferences({
  initialLocale,
  initialTheme,
  initialTimezone,
  initialFavoriteSports,
  initialPromptPreferences,
  initialMarketPreferences,
  initialOnboardingState,
  initialViewerGeo,
}) {
  return normalizeProfilePreferences(
    {
      ...DEFAULT_PROFILE_PREFERENCES,
      locale: initialLocale,
      theme: initialTheme,
      timezone: initialTimezone,
      favoriteSports: initialFavoriteSports,
      promptPreferences: initialPromptPreferences,
      marketPreferences: initialMarketPreferences,
      onboardingState: initialOnboardingState,
    },
    {
      fallbackGeo: initialViewerGeo,
    }
  );
}

export function PreferencesProvider({
  children,
  initialLocale,
  initialTheme,
  initialWatchlist,
  initialAlertSettings,
  initialRecentViews,
  initialFavoriteSports,
  initialTimezone,
  initialPromptPreferences,
  initialMarketPreferences,
  initialOnboardingState,
  initialViewerGeo,
}) {
  const initialProfilePreferences = useMemo(
    () =>
      buildInitialProfilePreferences({
        initialLocale,
        initialTheme,
        initialTimezone,
        initialFavoriteSports,
        initialPromptPreferences,
        initialMarketPreferences,
        initialOnboardingState,
        initialViewerGeo,
      }),
    [
      initialFavoriteSports,
      initialLocale,
      initialMarketPreferences,
      initialOnboardingState,
      initialPromptPreferences,
      initialTheme,
      initialTimezone,
      initialViewerGeo,
    ]
  );
  const [profilePreferences, setProfilePreferences] = useState(initialProfilePreferences);
  const [watchlist, setWatchlist] = useState(initialWatchlist || []);
  const [alertSettings, setAlertSettings] = useState(initialAlertSettings || {});
  const [recentViews, setRecentViews] = useState(initialRecentViews || []);
  const [sessionUser, setSessionUser] = useState(null);
  const [favoritesHydrated, setFavoritesHydrated] = useState(false);

  const compliance = useMemo(
    () =>
      getProfileComplianceSnapshot(profilePreferences, {
        viewerGeo: initialViewerGeo,
      }),
    [initialViewerGeo, profilePreferences]
  );

  useEffect(() => {
    const nextTheme = profilePreferences.theme;
    document.documentElement.dataset.theme = resolveTheme(nextTheme);
    document.documentElement.dataset.themePreference = nextTheme;
    window.localStorage.setItem(THEME_COOKIE_NAME, nextTheme);
    setCookie(THEME_COOKIE_NAME, nextTheme);
  }, [profilePreferences.theme]);

  useEffect(() => {
    setCookie(LOCALE_COOKIE_NAME, profilePreferences.locale);
  }, [profilePreferences.locale]);

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
    const serialized = writeFavoriteSports(profilePreferences.favoriteSports);
    window.localStorage.setItem(FAVORITE_SPORTS_COOKIE_NAME, serialized);
    setCookie(FAVORITE_SPORTS_COOKIE_NAME, serialized);
  }, [profilePreferences.favoriteSports]);

  useEffect(() => {
    const serialized = writeTimezone(profilePreferences.timezone);
    window.localStorage.setItem(TIMEZONE_COOKIE_NAME, serialized);
    setCookie(TIMEZONE_COOKIE_NAME, serialized);
  }, [profilePreferences.timezone]);

  useEffect(() => {
    const serialized = writePromptPreferences(profilePreferences.promptPreferences);
    window.localStorage.setItem(PROMPT_PREFERENCES_COOKIE_NAME, serialized);
    setCookie(PROMPT_PREFERENCES_COOKIE_NAME, serialized);
  }, [profilePreferences.promptPreferences]);

  useEffect(() => {
    const serialized = writeMarketPreferences(profilePreferences.marketPreferences);
    window.localStorage.setItem(MARKET_PREFERENCES_COOKIE_NAME, serialized);
    setCookie(MARKET_PREFERENCES_COOKIE_NAME, serialized);
    setCookie(GEO_COOKIE_NAME, profilePreferences.marketPreferences.preferredGeo);
  }, [profilePreferences.marketPreferences]);

  useEffect(() => {
    const serialized = writeOnboardingState(profilePreferences.onboardingState);
    window.localStorage.setItem(ONBOARDING_STATE_COOKIE_NAME, serialized);
    setCookie(ONBOARDING_STATE_COOKIE_NAME, serialized);
  }, [profilePreferences.onboardingState]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (profilePreferences.theme === "system") {
        document.documentElement.dataset.theme = resolveTheme(profilePreferences.theme);
      }
    };

    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, [profilePreferences.theme]);

  useEffect(() => {
    let active = true;

    async function hydratePreferences() {
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
        const localOnlyFavorites = (initialWatchlist || []).filter(
          (itemId) => !remoteWatchlist.includes(itemId)
        );

        if (localOnlyFavorites.length) {
          await fetch("/api/favorites", {
            method: "POST",
            headers: { "content-type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({ itemIds: localOnlyFavorites }),
          }).catch(() => null);
        }

        const remoteAlertSettings = alertsResponse.ok
          ? (await alertsResponse.json()).settings || {}
          : {};
        const remoteProfilePreferences = profilePreferencesResponse.ok
          ? await profilePreferencesResponse.json()
          : null;
        const mergedProfilePreferences = mergeProfilePreferences(
          initialProfilePreferences,
          remoteProfilePreferences || {},
          {
            fallbackGeo: initialViewerGeo,
          }
        );
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
          }).catch(() => null);
        }

        if (
          remoteProfilePreferences &&
          !areEquivalentPreferences(
            remoteProfilePreferences,
            mergedProfilePreferences,
            initialViewerGeo
          )
        ) {
          await fetch("/api/profile/preferences", {
            method: "PUT",
            headers: { "content-type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify(mergedProfilePreferences),
          }).catch(() => null);
        }

        if (!active) {
          return;
        }

        setProfilePreferences(mergedProfilePreferences);
        setWatchlist([...new Set([...remoteWatchlist, ...localOnlyFavorites])]);
        setAlertSettings(mergeAlertSettings(remoteAlertSettings, initialAlertSettings || {}));
      } finally {
        if (active) {
          setFavoritesHydrated(true);
        }
      }
    }

    hydratePreferences();

    return () => {
      active = false;
    };
  }, [
    initialAlertSettings,
    initialProfilePreferences,
    initialViewerGeo,
    initialWatchlist,
  ]);

  const persistProfilePreferences = useCallback(
    async (nextValue) => {
      const normalized = normalizeProfilePreferences(nextValue, {
        fallbackGeo: initialViewerGeo,
      });
      setProfilePreferences(normalized);

      if (!sessionUser) {
        return true;
      }

      const response = await fetch("/api/profile/preferences", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(normalized),
      }).catch(() => null);

      return Boolean(response?.ok);
    },
    [initialViewerGeo, sessionUser]
  );

  const updateProfilePreferences = useCallback(
    async (nextValue, options = {}) => {
      const previous = profilePreferences;
      const resolvedValue =
        typeof nextValue === "function" ? nextValue(profilePreferences) : nextValue;
      const normalized = normalizeProfilePreferences(resolvedValue, {
        fallbackGeo: initialViewerGeo,
      });

      setProfilePreferences(normalized);
      const persisted = await persistProfilePreferences(normalized);
      if (persisted) {
        return true;
      }

      setProfilePreferences(previous);
      return options.silent ? false : false;
    },
    [initialViewerGeo, persistProfilePreferences, profilePreferences]
  );

  const toggleWatch = useCallback(
    async (itemId, options = {}) => {
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
      ).catch(() => null);

      if (response?.ok) {
        return;
      }

      setWatchlist(watchlist);
    },
    [sessionUser, watchlist]
  );

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

      additions.forEach((itemId) => {
        trackPersonalizationEvent({
          event: "favorite_created",
          surface: options.surface || "app",
          itemId,
          metadata: {
            authenticated: Boolean(sessionUser),
            source: options.source || "batch",
          },
        });
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

      if (shouldAutoFavorite) {
        trackProductAnalyticsEvent({
          event: "favorites_depth_changed",
          surface: options.surface || "app",
          entityId: itemId,
          metadata: {
            action: "add",
            count: nextWatchlist.length,
            authenticated: Boolean(sessionUser),
            source: "alert_opt_in",
          },
        });

        trackPersonalizationEvent({
          event: "favorite_created",
          surface: options.surface || "app",
          itemId,
          metadata: {
            authenticated: Boolean(sessionUser),
            label: options.label || null,
            source: "alert_opt_in",
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

      const responses = await Promise.all(requests).catch(() => []);

      if (responses.length && responses.every((response) => response.ok)) {
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

  const setTheme = useCallback(
    async (theme) =>
      updateProfilePreferences((current) => ({
        ...current,
        theme,
      })),
    [updateProfilePreferences]
  );

  const setLocalePreference = useCallback(
    async (locale) =>
      updateProfilePreferences((current) => ({
        ...current,
        locale,
      })),
    [updateProfilePreferences]
  );

  const setTimezonePreference = useCallback(
    async (timezone) =>
      updateProfilePreferences((current) => ({
        ...current,
        timezone,
      })),
    [updateProfilePreferences]
  );

  const saveFavoriteSports = useCallback(
    async (sports, options = {}) =>
      updateProfilePreferences(
        (current) => ({
          ...current,
          favoriteSports: sports,
        }),
        options
      ),
    [updateProfilePreferences]
  );

  const setPromptPreferences = useCallback(
    async (nextPromptPreferences, options = {}) => {
      const changedKeys = Object.keys(nextPromptPreferences || {}).filter(
        (key) => profilePreferences.promptPreferences?.[key] !== nextPromptPreferences?.[key]
      );

      if (changedKeys.length) {
        trackProductAnalyticsEvent({
          event: "prompt_opt_in_changed",
          surface: options.surface || "preferences",
          metadata: {
            changedKeys,
            values: Object.fromEntries(
              changedKeys.map((key) => [key, Boolean(nextPromptPreferences?.[key])])
            ),
            authenticated: Boolean(sessionUser),
          },
        });
      }

      return updateProfilePreferences(
        (current) => ({
          ...current,
          promptPreferences: {
            ...current.promptPreferences,
            ...nextPromptPreferences,
          },
        }),
        options
      );
    },
    [profilePreferences.promptPreferences, sessionUser, updateProfilePreferences]
  );

  const setPromptPreference = useCallback(
    async (key, value, options = {}) =>
      setPromptPreferences(
        {
          [key]: value,
        },
        options
      ),
    [setPromptPreferences]
  );

  const setMarketPreferences = useCallback(
    async (nextMarketPreferences, options = {}) =>
      updateProfilePreferences(
        (current) => ({
          ...current,
          marketPreferences: {
            ...current.marketPreferences,
            ...nextMarketPreferences,
          },
        }),
        options
      ),
    [updateProfilePreferences]
  );

  const completeOnboarding = useCallback(
    async (options = {}) =>
      updateProfilePreferences(
        (current) => ({
          ...current,
          onboardingState: {
            ...current.onboardingState,
            completed: true,
            dismissed: false,
            completedAt: new Date().toISOString(),
          },
        }),
        options
      ),
    [updateProfilePreferences]
  );

  const dismissOnboarding = useCallback(
    async (options = {}) =>
      updateProfilePreferences(
        (current) => ({
          ...current,
          onboardingState: {
            ...current.onboardingState,
            dismissed: true,
            dismissedAt: new Date().toISOString(),
          },
        }),
        options
      ),
    [updateProfilePreferences]
  );

  const resetOnboarding = useCallback(
    async (options = {}) =>
      updateProfilePreferences(
        (current) => ({
          ...current,
          onboardingState: DEFAULT_ONBOARDING_STATE,
        }),
        options
      ),
    [updateProfilePreferences]
  );

  const value = useMemo(
    () => ({
      locale: profilePreferences.locale,
      theme: profilePreferences.theme,
      timezone: profilePreferences.timezone,
      favoriteSports: profilePreferences.favoriteSports,
      promptPreferences: profilePreferences.promptPreferences,
      marketPreferences: profilePreferences.marketPreferences,
      onboardingState: profilePreferences.onboardingState,
      profilePreferences,
      compliance,
      effectiveGeo: compliance.effectiveGeo,
      ctaGeo: compliance.ctaGeo,
      watchlist,
      watchlistCount: watchlist.length,
      favoritesCount: watchlist.length,
      alertSettings,
      alertCount: Object.values(alertSettings).reduce((count, entry) => count + entry.length, 0),
      recentViews,
      favoritesHydrated,
      recentViews,
      sessionUser,
      isWatched: (itemId) => watchlist.includes(itemId),
      isFavorite: (itemId) => watchlist.includes(itemId),
      getAlertTypes: (itemId) => alertSettings[itemId] || [],
      hasAlertType: (itemId, notificationType) =>
        (alertSettings[itemId] || []).includes(notificationType),
      setTheme,
      setLocalePreference,
      setTimezonePreference,
      setFavoriteSports: saveFavoriteSports,
      setPromptPreferences,
      setPromptPreference,
      setMarketPreferences,
      updateProfilePreferences,
      completeOnboarding,
      dismissOnboarding,
      resetOnboarding,
      toggleWatch,
      toggleFavorite: toggleWatch,
      addFavoriteItems,
      toggleAlertType,
      recordView,
    }),
    [
      addFavoriteItems,
      alertSettings,
      compliance,
      completeOnboarding,
      dismissOnboarding,
      favoritesHydrated,
      profilePreferences,
      recentViews,
      recordView,
      resetOnboarding,
      saveFavoriteSports,
      sessionUser,
      setLocalePreference,
      setMarketPreferences,
      setPromptPreference,
      setPromptPreferences,
      setTheme,
      setTimezonePreference,
      toggleAlertType,
      toggleWatch,
      updateProfilePreferences,
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
