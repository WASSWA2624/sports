import { buildTeamSlug } from "./team-branding";

export function buildCompetitionHref(locale, competition) {
  const code = competition?.code || competition?.leagueCode || competition?.competitionCode;
  return code ? `/${locale}/leagues/${code}` : `/${locale}/leagues`;
}

export function buildMatchHref(locale, fixture) {
  const reference = fixture?.externalRef || fixture?.id;
  return reference ? `/${locale}/match/${reference}` : `/${locale}`;
}

export function buildTeamHref(locale, team) {
  const slug = team?.slug || buildTeamSlug(team?.name || team?.shortName);
  return slug ? `/${locale}/teams/${slug}` : `/${locale}`;
}
