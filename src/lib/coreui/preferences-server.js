import { cookies } from "next/headers";
import {
  ALERT_SETTINGS_COOKIE_NAME,
  FAVORITE_SPORTS_COOKIE_NAME,
  LOCALE_COOKIE_NAME,
  RECENT_VIEWS_COOKIE_NAME,
  THEME_COOKIE_NAME,
  WATCHLIST_COOKIE_NAME,
  readFavoriteSports,
  normalizeLocale,
  normalizeTheme,
  readAlertSettings,
  readRecentViews,
  readWatchlist,
} from "./preferences";

export async function getPreferenceSnapshot() {
  const cookieStore = await cookies();
  return {
    locale: normalizeLocale(cookieStore.get(LOCALE_COOKIE_NAME)?.value),
    theme: normalizeTheme(cookieStore.get(THEME_COOKIE_NAME)?.value),
    watchlist: readWatchlist(cookieStore.get(WATCHLIST_COOKIE_NAME)?.value),
    alertSettings: readAlertSettings(cookieStore.get(ALERT_SETTINGS_COOKIE_NAME)?.value),
    recentViews: readRecentViews(cookieStore.get(RECENT_VIEWS_COOKIE_NAME)?.value),
    favoriteSports: readFavoriteSports(cookieStore.get(FAVORITE_SPORTS_COOKIE_NAME)?.value),
  };
}

export async function getPreferredLocale() {
  const snapshot = await getPreferenceSnapshot();
  return snapshot.locale;
}
