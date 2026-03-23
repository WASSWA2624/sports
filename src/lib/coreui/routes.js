function normalizePathSegment(value, fallback) {
  const segment = String(value || fallback || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return segment || fallback || "";
}

export function getSportSegment(sport) {
  return normalizePathSegment(sport?.slug || sport?.code, "sport");
}

export function getCountrySegment(country) {
  return normalizePathSegment(country?.slug || country?.code, "country");
}

export function buildSportHref(locale, sport) {
  return `/${locale}/sports/${getSportSegment(sport)}`;
}

export function buildCountryHref(locale, country, sport) {
  return `${buildSportHref(locale, sport)}/countries/${getCountrySegment(country)}`;
}

export function buildCompetitionHref(locale, competition) {
  const code = competition?.code || competition?.leagueCode || competition?.competitionCode;
  return code ? `/${locale}/leagues/${code}` : `/${locale}/leagues`;
}

export function buildTeamHref(locale, team) {
  const reference = team?.id || team?.code;
  return reference ? `/${locale}/teams/${reference}` : `/${locale}/teams`;
}

export function buildMatchHref(locale, fixture) {
  const reference = fixture?.externalRef || fixture?.id;
  return reference ? `/${locale}/match/${reference}` : `/${locale}`;
}
