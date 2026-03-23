import { cookies } from "next/headers";
import {
  LOCALE_COOKIE_NAME,
  THEME_COOKIE_NAME,
  WATCHLIST_COOKIE_NAME,
  normalizeLocale,
  normalizeTheme,
  readWatchlist,
} from "./preferences";

export async function getPreferenceSnapshot() {
  const cookieStore = await cookies();
  return {
    locale: normalizeLocale(cookieStore.get(LOCALE_COOKIE_NAME)?.value),
    theme: normalizeTheme(cookieStore.get(THEME_COOKIE_NAME)?.value),
    watchlist: readWatchlist(cookieStore.get(WATCHLIST_COOKIE_NAME)?.value),
  };
}

export async function getPreferredLocale() {
  const snapshot = await getPreferenceSnapshot();
  return snapshot.locale;
}
