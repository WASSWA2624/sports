export const SUPPORTED_LOCALES = ["en", "fr", "sw"];
export const DEFAULT_LOCALE = "en";
export const LOCALE_COOKIE_NAME = "sports_locale";
export const DEFAULT_THEME = "dark";

export function normalizeLocale(locale) {
  return SUPPORTED_LOCALES.includes(locale) ? locale : DEFAULT_LOCALE;
}
