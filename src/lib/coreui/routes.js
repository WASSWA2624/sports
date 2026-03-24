import { appendRouteContext } from "./route-context";

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

export function buildSportHref(locale, sport, options) {
  return appendRouteContext(`/${locale}/sports/${getSportSegment(sport)}`, options);
}

export function buildCountryHref(locale, country, sport, options) {
  return appendRouteContext(
    `${buildSportHref(locale, sport)}/countries/${getCountrySegment(country)}`,
    options
  );
}

export function buildCompetitionHref(locale, competition, options) {
  const code = competition?.code || competition?.leagueCode || competition?.competitionCode;
  return appendRouteContext(code ? `/${locale}/leagues/${code}` : `/${locale}/leagues`, options);
}

export function buildTeamHref(locale, team, options) {
  const reference = team?.id || team?.code;
  return appendRouteContext(
    reference ? `/${locale}/teams/${reference}` : `/${locale}/teams`,
    options
  );
}

export function buildMatchHref(locale, fixture, options) {
  const reference = fixture?.externalRef || fixture?.id;
  return appendRouteContext(reference ? `/${locale}/match/${reference}` : `/${locale}`, options);
}
