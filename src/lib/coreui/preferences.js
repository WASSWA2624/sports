import { normalizeAlertSettings } from "../alerts";
import { normalizeFavoriteItems } from "../favorites";

export const SUPPORTED_LOCALES = ["en", "fr", "sw"];
export const DEFAULT_LOCALE = "en";
export const LOCALE_COOKIE_NAME = "sports_locale";
export const THEME_COOKIE_NAME = "sports_theme";
export const WATCHLIST_COOKIE_NAME = "sports_watchlist";
export const ALERT_SETTINGS_COOKIE_NAME = "sports_alert_settings";
export const RECENT_VIEWS_COOKIE_NAME = "sports_recent_views";
export const FAVORITE_SPORTS_COOKIE_NAME = "sports_favorite_sports";
export const TIMEZONE_COOKIE_NAME = "sports_timezone";
export const PROMPT_PREFERENCES_COOKIE_NAME = "sports_prompt_preferences";
export const MARKET_PREFERENCES_COOKIE_NAME = "sports_market_preferences";
export const ONBOARDING_STATE_COOKIE_NAME = "sports_onboarding_state";
export const DEFAULT_THEME = "system";
export const SUPPORTED_THEMES = ["light", "dark", "system"];
export const WATCHLIST_LIMIT = 24;
export const ALERT_SETTINGS_LIMIT = 24;
export const RECENT_VIEWS_LIMIT = 20;
export const FAVORITE_SPORTS_LIMIT = 12;

export function normalizeLocale(locale) {
  return SUPPORTED_LOCALES.includes(locale) ? locale : DEFAULT_LOCALE;
}

export function normalizeTheme(theme) {
  return SUPPORTED_THEMES.includes(theme) ? theme : DEFAULT_THEME;
}

export function readWatchlist(value) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return [...new Set(parsed.map((item) => String(item)).slice(0, WATCHLIST_LIMIT))];
  } catch (error) {
    return [];
  }
}

export function writeWatchlist(items) {
  return JSON.stringify([...new Set(items.map((item) => String(item)).slice(0, WATCHLIST_LIMIT))]);
}

function clampAlertSettings(settings) {
  return Object.fromEntries(
    Object.entries(normalizeAlertSettings(settings)).slice(0, ALERT_SETTINGS_LIMIT)
  );
}

export function readAlertSettings(value) {
  if (!value) {
    return {};
  }

  try {
    return clampAlertSettings(JSON.parse(value));
  } catch (error) {
    return {};
  }
}

export function writeAlertSettings(settings) {
  return JSON.stringify(clampAlertSettings(settings));
}

export function readRecentViews(value) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return normalizeFavoriteItems(parsed).slice(0, RECENT_VIEWS_LIMIT);
  } catch (error) {
    return [];
  }
}

export function writeRecentViews(items) {
  return JSON.stringify(normalizeFavoriteItems(items).slice(0, RECENT_VIEWS_LIMIT));
}

export function readFavoriteSports(value) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return [...new Set(
      parsed
        .map((item) => String(item || "").trim().toLowerCase())
        .filter(Boolean)
        .slice(0, FAVORITE_SPORTS_LIMIT)
    )];
  } catch (error) {
    return [];
  }
}

export function writeFavoriteSports(items) {
  return JSON.stringify(
    [...new Set(
      (items || [])
        .map((item) => String(item || "").trim().toLowerCase())
        .filter(Boolean)
      .slice(0, FAVORITE_SPORTS_LIMIT)
    )]
  );
}

function readJsonObject(value) {
  if (!value) {
    return {};
  }

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    return {};
  }
}

function writeJsonObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return JSON.stringify({});
  }

  return JSON.stringify(value);
}

export function readTimezone(value) {
  return String(value || "").trim() || "UTC";
}

export function writeTimezone(value) {
  return String(value || "").trim() || "UTC";
}

export function readPromptPreferences(value) {
  return readJsonObject(value);
}

export function writePromptPreferences(value) {
  return writeJsonObject(value);
}

export function readMarketPreferences(value) {
  return readJsonObject(value);
}

export function writeMarketPreferences(value) {
  return writeJsonObject(value);
}

export function readOnboardingState(value) {
  return readJsonObject(value);
}

export function writeOnboardingState(value) {
  return writeJsonObject(value);
}
