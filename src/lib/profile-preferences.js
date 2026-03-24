import { z } from "zod";
import {
  DEFAULT_LOCALE,
  DEFAULT_THEME,
  normalizeLocale,
  normalizeTheme,
} from "./coreui/preferences";
import {
  DEFAULT_MARKET_GEO,
  LAUNCH_MARKET_GEOS,
  normalizeGeo,
} from "./coreui/route-context";

export const DEFAULT_ALERT_PREFERENCES = Object.freeze({
  goals: true,
  cards: false,
  kickoff: true,
  periodChange: false,
  finalResult: true,
  news: true,
});

export const DEFAULT_PROMPT_PREFERENCES = Object.freeze({
  reminderPrompts: false,
  funnelPrompts: false,
  bookmakerPrompts: false,
});

export const DEFAULT_MARKET_PREFERENCES = Object.freeze({
  preferredGeo: DEFAULT_MARKET_GEO,
  bookmakerGeo: DEFAULT_MARKET_GEO,
  ctaGeo: DEFAULT_MARKET_GEO,
});

export const DEFAULT_ONBOARDING_STATE = Object.freeze({
  completed: false,
  dismissed: false,
  completedAt: null,
  dismissedAt: null,
});

export const DEFAULT_PROFILE_PREFERENCES = Object.freeze({
  locale: DEFAULT_LOCALE,
  theme: DEFAULT_THEME,
  timezone: "UTC",
  favoriteSports: [],
  alertPreferences: DEFAULT_ALERT_PREFERENCES,
  promptPreferences: DEFAULT_PROMPT_PREFERENCES,
  marketPreferences: DEFAULT_MARKET_PREFERENCES,
  onboardingState: DEFAULT_ONBOARDING_STATE,
});

export const PROFILE_PREFERENCE_KEYS = Object.freeze([
  "locale",
  "theme",
  "timezone",
  "favoriteSports",
  "alertPreferences",
  "promptPreferences",
  "marketPreferences",
  "onboardingState",
]);

const alertPreferencesSchema = z
  .object({
    goals: z.boolean().default(DEFAULT_ALERT_PREFERENCES.goals),
    cards: z.boolean().default(DEFAULT_ALERT_PREFERENCES.cards),
    kickoff: z.boolean().default(DEFAULT_ALERT_PREFERENCES.kickoff),
    periodChange: z.boolean().default(DEFAULT_ALERT_PREFERENCES.periodChange),
    finalResult: z.boolean().default(DEFAULT_ALERT_PREFERENCES.finalResult),
    news: z.boolean().default(DEFAULT_ALERT_PREFERENCES.news),
  })
  .default(DEFAULT_ALERT_PREFERENCES);

const promptPreferencesSchema = z
  .object({
    reminderPrompts: z.boolean().default(DEFAULT_PROMPT_PREFERENCES.reminderPrompts),
    funnelPrompts: z.boolean().default(DEFAULT_PROMPT_PREFERENCES.funnelPrompts),
    bookmakerPrompts: z.boolean().default(DEFAULT_PROMPT_PREFERENCES.bookmakerPrompts),
  })
  .default(DEFAULT_PROMPT_PREFERENCES);

const marketPreferencesSchema = z
  .object({
    preferredGeo: z.string().default(DEFAULT_MARKET_GEO),
    bookmakerGeo: z.string().default(DEFAULT_MARKET_GEO),
    ctaGeo: z.string().default(DEFAULT_MARKET_GEO),
  })
  .default(DEFAULT_MARKET_PREFERENCES);

const onboardingStateSchema = z
  .object({
    completed: z.boolean().default(DEFAULT_ONBOARDING_STATE.completed),
    dismissed: z.boolean().default(DEFAULT_ONBOARDING_STATE.dismissed),
    completedAt: z.string().nullable().optional(),
    dismissedAt: z.string().nullable().optional(),
  })
  .default(DEFAULT_ONBOARDING_STATE);

const profilePreferencesSchema = z.object({
  locale: z.string().default(DEFAULT_LOCALE),
  theme: z.string().default(DEFAULT_THEME),
  timezone: z.string().default("UTC"),
  favoriteSports: z.array(z.string()).default([]),
  alertPreferences: alertPreferencesSchema,
  promptPreferences: promptPreferencesSchema,
  marketPreferences: marketPreferencesSchema,
  onboardingState: onboardingStateSchema,
});

function normalizeFavoriteSportsInput(value) {
  const list = Array.isArray(value) ? value : [value];

  return [...new Set(
    list
      .map((entry) => String(entry || "").trim().toLowerCase())
      .filter(Boolean)
  )].slice(0, 12);
}

function normalizeTimestamp(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function isEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function pickExplicitValue(localValue, remoteValue, fallbackValue) {
  if (!isEqual(localValue, fallbackValue)) {
    return localValue;
  }

  if (!isEqual(remoteValue, fallbackValue)) {
    return remoteValue;
  }

  return localValue ?? remoteValue ?? fallbackValue;
}

export function normalizeAlertPreferenceProfile(value) {
  const parsed = alertPreferencesSchema.parse(value || {});
  return {
    goals: Boolean(parsed.goals),
    cards: Boolean(parsed.cards),
    kickoff: Boolean(parsed.kickoff),
    periodChange: Boolean(parsed.periodChange),
    finalResult: Boolean(parsed.finalResult),
    news: Boolean(parsed.news),
  };
}

export function normalizePromptPreferences(value) {
  const parsed = promptPreferencesSchema.parse(value || {});
  return {
    reminderPrompts: Boolean(parsed.reminderPrompts),
    funnelPrompts: Boolean(parsed.funnelPrompts),
    bookmakerPrompts: Boolean(parsed.bookmakerPrompts),
  };
}

export function normalizeMarketPreferences(value, { fallbackGeo = DEFAULT_MARKET_GEO } = {}) {
  const source =
    value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const parsed = marketPreferencesSchema.parse(value || {});
  const preferredGeo = normalizeGeo(source.preferredGeo || parsed.preferredGeo, fallbackGeo);

  return {
    preferredGeo,
    bookmakerGeo: normalizeGeo(source.bookmakerGeo || preferredGeo, preferredGeo),
    ctaGeo: normalizeGeo(source.ctaGeo || preferredGeo, preferredGeo),
  };
}

export function normalizeOnboardingState(value) {
  const parsed = onboardingStateSchema.parse(value || {});

  return {
    completed: Boolean(parsed.completed),
    dismissed: Boolean(parsed.dismissed),
    completedAt: normalizeTimestamp(parsed.completedAt),
    dismissedAt: normalizeTimestamp(parsed.dismissedAt),
  };
}

export function normalizeProfilePreferences(value, { fallbackGeo = DEFAULT_MARKET_GEO } = {}) {
  const source =
    value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const parsed = profilePreferencesSchema.parse(value || {});

  return {
    locale: normalizeLocale(parsed.locale),
    theme: normalizeTheme(parsed.theme),
    timezone: String(parsed.timezone || "UTC").trim() || "UTC",
    favoriteSports: normalizeFavoriteSportsInput(parsed.favoriteSports),
    alertPreferences: normalizeAlertPreferenceProfile(parsed.alertPreferences),
    promptPreferences: normalizePromptPreferences(parsed.promptPreferences),
    marketPreferences: normalizeMarketPreferences(
      source.marketPreferences || parsed.marketPreferences,
      { fallbackGeo }
    ),
    onboardingState: normalizeOnboardingState(parsed.onboardingState),
  };
}

export function readProfilePreferencesFromEntries(entries = [], options = {}) {
  const stored = Object.fromEntries((entries || []).map((entry) => [entry.key, entry.value]));

  return normalizeProfilePreferences(
    {
      locale: stored.locale,
      theme: stored.theme,
      timezone: stored.timezone,
      favoriteSports: stored.favoriteSports,
      alertPreferences: stored.alertPreferences,
      promptPreferences: stored.promptPreferences,
      marketPreferences: stored.marketPreferences,
      onboardingState: stored.onboardingState,
    },
    options
  );
}

export function mergeProfilePreferences(localValue, remoteValue, options = {}) {
  const local = normalizeProfilePreferences(localValue, options);
  const remote = normalizeProfilePreferences(remoteValue, options);

  return normalizeProfilePreferences(
    {
      locale: pickExplicitValue(local.locale, remote.locale, DEFAULT_LOCALE),
      theme: pickExplicitValue(local.theme, remote.theme, DEFAULT_THEME),
      timezone: pickExplicitValue(local.timezone, remote.timezone, "UTC"),
      favoriteSports: [...new Set([...local.favoriteSports, ...remote.favoriteSports])].slice(0, 12),
      alertPreferences: {
        goals: pickExplicitValue(
          local.alertPreferences.goals,
          remote.alertPreferences.goals,
          DEFAULT_ALERT_PREFERENCES.goals
        ),
        cards: pickExplicitValue(
          local.alertPreferences.cards,
          remote.alertPreferences.cards,
          DEFAULT_ALERT_PREFERENCES.cards
        ),
        kickoff: pickExplicitValue(
          local.alertPreferences.kickoff,
          remote.alertPreferences.kickoff,
          DEFAULT_ALERT_PREFERENCES.kickoff
        ),
        periodChange: pickExplicitValue(
          local.alertPreferences.periodChange,
          remote.alertPreferences.periodChange,
          DEFAULT_ALERT_PREFERENCES.periodChange
        ),
        finalResult: pickExplicitValue(
          local.alertPreferences.finalResult,
          remote.alertPreferences.finalResult,
          DEFAULT_ALERT_PREFERENCES.finalResult
        ),
        news: pickExplicitValue(
          local.alertPreferences.news,
          remote.alertPreferences.news,
          DEFAULT_ALERT_PREFERENCES.news
        ),
      },
      promptPreferences: {
        reminderPrompts:
          local.promptPreferences.reminderPrompts || remote.promptPreferences.reminderPrompts,
        funnelPrompts: local.promptPreferences.funnelPrompts || remote.promptPreferences.funnelPrompts,
        bookmakerPrompts:
          local.promptPreferences.bookmakerPrompts || remote.promptPreferences.bookmakerPrompts,
      },
      marketPreferences: {
        preferredGeo: pickExplicitValue(
          local.marketPreferences.preferredGeo,
          remote.marketPreferences.preferredGeo,
          DEFAULT_MARKET_GEO
        ),
        bookmakerGeo: pickExplicitValue(
          local.marketPreferences.bookmakerGeo,
          remote.marketPreferences.bookmakerGeo,
          DEFAULT_MARKET_GEO
        ),
        ctaGeo: pickExplicitValue(
          local.marketPreferences.ctaGeo,
          remote.marketPreferences.ctaGeo,
          DEFAULT_MARKET_GEO
        ),
      },
      onboardingState: {
        completed: local.onboardingState.completed || remote.onboardingState.completed,
        dismissed: local.onboardingState.dismissed || remote.onboardingState.dismissed,
        completedAt:
          normalizeTimestamp(local.onboardingState.completedAt) ||
          normalizeTimestamp(remote.onboardingState.completedAt),
        dismissedAt:
          normalizeTimestamp(local.onboardingState.dismissedAt) ||
          normalizeTimestamp(remote.onboardingState.dismissedAt),
      },
    },
    options
  );
}

export function mapProfilePreferencesToRecords(value, options = {}) {
  const normalized = normalizeProfilePreferences(value, options);

  return {
    locale: normalized.locale,
    theme: normalized.theme,
    timezone: normalized.timezone,
    favoriteSports: normalized.favoriteSports,
    alertPreferences: normalized.alertPreferences,
    promptPreferences: normalized.promptPreferences,
    marketPreferences: normalized.marketPreferences,
    onboardingState: normalized.onboardingState,
  };
}

export function getProfileComplianceSnapshot(value, { viewerGeo = DEFAULT_MARKET_GEO } = {}) {
  const preferences = normalizeProfilePreferences(value, {
    fallbackGeo: viewerGeo,
  });
  const effectiveGeo = normalizeGeo(preferences.marketPreferences.preferredGeo, viewerGeo);
  const ctaGeo = normalizeGeo(preferences.marketPreferences.ctaGeo, effectiveGeo);
  const bookmakerGeo = normalizeGeo(preferences.marketPreferences.bookmakerGeo, effectiveGeo);

  return {
    viewerGeo: normalizeGeo(viewerGeo),
    effectiveGeo,
    ctaGeo,
    bookmakerGeo,
    promptOptInAllowed: LAUNCH_MARKET_GEOS.includes(ctaGeo),
    bookmakerPromptAllowed: LAUNCH_MARKET_GEOS.includes(bookmakerGeo),
    regulatedCopyRequired:
      effectiveGeo !== DEFAULT_MARKET_GEO ||
      ctaGeo !== DEFAULT_MARKET_GEO ||
      bookmakerGeo !== DEFAULT_MARKET_GEO,
  };
}
