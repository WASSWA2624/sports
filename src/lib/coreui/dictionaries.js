import { Buffer } from "buffer";
import { dictionaries, SUPPORTED_DICTIONARY_LOCALES } from "./i18n";
import { SHELL_LOCALE_OVERRIDES } from "./i18n/shell-overrides";

export { SUPPORTED_DICTIONARY_LOCALES };

const MOJIBAKE_PATTERN = /Ã|Â|â/;

function repairPotentialMojibake(value) {
  if (typeof value !== "string" || !MOJIBAKE_PATTERN.test(value)) {
    return value;
  }

  let repaired = value;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (!MOJIBAKE_PATTERN.test(repaired)) {
      break;
    }

    const next = Buffer.from(repaired, "latin1").toString("utf8");

    if (!next || next === repaired || next.includes("\uFFFD")) {
      break;
    }

    repaired = next;
  }

  return repaired;
}

function sanitizeDictionary(dictionary) {
  return Object.fromEntries(
    Object.entries(dictionary || {}).map(([key, value]) => [key, repairPotentialMojibake(value)])
  );
}

export function getDictionary(locale) {
  const sanitizedEnglish = sanitizeDictionary(dictionaries.en);

  if (locale === "en") {
    return sanitizedEnglish;
  }

  return {
    ...sanitizedEnglish,
    ...sanitizeDictionary(dictionaries[locale] || {}),
    ...(SHELL_LOCALE_OVERRIDES[locale] || {}),
  };
}

export function formatDictionaryText(template, values = {}) {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
    template
  );
}

export function getScoreViewLabel(key, dictionary) {
  const labels = {
    home: dictionary.home,
    live: dictionary.live,
    fixtures: dictionary.fixtures,
    results: dictionary.results,
    tables: dictionary.tables,
    leagues: dictionary.leagues,
    teams: dictionary.teams,
  };

  return labels[key] || key;
}

export function getSportLabel(key, dictionary) {
  const labels = {
    favorites: dictionary.favorites,
    football: dictionary.football,
    tennis: dictionary.tennis,
    basketball: dictionary.basketball,
    hockey: dictionary.hockey,
    golf: dictionary.golf,
    baseball: dictionary.baseball,
    snooker: dictionary.snooker,
    volleyball: dictionary.volleyball,
    more: dictionary.more,
  };

  return labels[key] || key;
}

export function getStandingViewLabel(key, dictionary) {
  const labels = {
    overall: dictionary.standingOverall,
    home: dictionary.standingHome,
    away: dictionary.standingAway,
    form: dictionary.standingForm,
    live: dictionary.standingLive,
  };

  return labels[key] || key;
}
