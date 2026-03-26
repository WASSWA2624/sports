export function buildCompetitionHref(locale, competition) {
  const code = competition?.code || competition?.leagueCode || competition?.competitionCode;
  return code ? `/${locale}/leagues/${code}` : `/${locale}/leagues`;
}

export function buildMatchHref(locale, fixture) {
  const reference = fixture?.externalRef || fixture?.id;
  return reference ? `/${locale}/match/${reference}` : `/${locale}`;
}
