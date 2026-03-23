import { dictionaries, SUPPORTED_DICTIONARY_LOCALES } from "./i18n";

export { SUPPORTED_DICTIONARY_LOCALES };

export function getDictionary(locale) {
  return dictionaries[locale] || dictionaries.en;
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
