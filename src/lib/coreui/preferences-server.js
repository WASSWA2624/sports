import { cookies, headers } from "next/headers";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  SUPPORTED_LOCALES,
  normalizeLocale,
} from "./preferences";

function detectLocaleFromHeader(acceptLanguage = "") {
  const candidates = String(acceptLanguage || "")
    .split(",")
    .map((entry) => entry.split(";")[0]?.trim().toLowerCase())
    .filter(Boolean);

  for (const candidate of candidates) {
    const base = candidate.split("-")[0];

    if (SUPPORTED_LOCALES.includes(candidate)) {
      return candidate;
    }

    if (SUPPORTED_LOCALES.includes(base)) {
      return base;
    }
  }

  return DEFAULT_LOCALE;
}

export async function getPreferredLocale() {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const headerLocale = detectLocaleFromHeader(headerStore.get("accept-language"));
  const cookieLocale = normalizeLocale(cookieStore.get(LOCALE_COOKIE_NAME)?.value);

  if (headerLocale && headerLocale !== DEFAULT_LOCALE) {
    return headerLocale;
  }

  if (cookieLocale && cookieLocale !== DEFAULT_LOCALE) {
    return cookieLocale;
  }

  return DEFAULT_LOCALE;
}
