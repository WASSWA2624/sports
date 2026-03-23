export const SUPPORTED_LOCALES = ["en", "fr", "sw"];
export const DEFAULT_LOCALE = "en";
export const LOCALE_COOKIE_NAME = "sports_locale";
export const THEME_COOKIE_NAME = "sports_theme";
export const WATCHLIST_COOKIE_NAME = "sports_watchlist";
export const DEFAULT_THEME = "system";
export const SUPPORTED_THEMES = ["light", "dark", "system"];
export const WATCHLIST_LIMIT = 24;

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
