import { getGeoLabel, isGeoAllowed } from "./coreui/route-context";
import {
  buildCompetitionHref,
  buildMatchHref,
  buildTeamHref,
} from "./coreui/routes";

export const FIXTURE_RETENTION_ALERT_TYPES = Object.freeze([
  "KICKOFF",
  "GOAL",
  "CARD",
  "PERIOD_CHANGE",
  "FINAL_RESULT",
  "NEWS",
]);

export const TEAM_RETENTION_ALERT_TYPES = Object.freeze([
  "KICKOFF",
  "FINAL_RESULT",
  "NEWS",
]);

export const COMPETITION_RETENTION_ALERT_TYPES = Object.freeze([
  "KICKOFF",
  "FINAL_RESULT",
  "NEWS",
]);

function buildFavoriteSurfaceItems(favorites, locale, dictionary) {
  const fixtureItems = (favorites?.fixtures || []).map((fixture) => ({
    itemId: `fixture:${fixture.id}`,
    title: `${fixture.homeTeam?.name || dictionary.match} vs ${fixture.awayTeam?.name || dictionary.match}`,
    subtitle: fixture.league?.name || dictionary.match,
    href: buildMatchHref(locale, fixture),
    kind: "fixture",
  }));

  const teamItems = (favorites?.teams || []).map((team) => ({
    itemId: `team:${team.id}`,
    title: team.name,
    subtitle: team.league?.name || dictionary.teams,
    href: buildTeamHref(locale, team),
    kind: "team",
  }));

  const competitionItems = (favorites?.competitions || []).map((competition) => ({
    itemId: `competition:${competition.code}`,
    title: competition.name,
    subtitle: competition.country || dictionary.competition,
    href: buildCompetitionHref(locale, competition),
    kind: "competition",
  }));

  return [...fixtureItems, ...teamItems, ...competitionItems];
}

function getSupportedTypesForFavoriteItem(item) {
  if (item?.kind === "fixture") {
    return [...FIXTURE_RETENTION_ALERT_TYPES];
  }

  if (item?.kind === "team") {
    return [...TEAM_RETENTION_ALERT_TYPES];
  }

  return [...COMPETITION_RETENTION_ALERT_TYPES];
}

export function buildFavoriteReminderItems({
  favorites,
  locale,
  dictionary,
  alertSettings = {},
  limit = 4,
  surface = "favorites-reminders",
} = {}) {
  return buildFavoriteSurfaceItems(favorites, locale, dictionary)
    .map((item) => ({
      ...item,
      supportedTypes: getSupportedTypesForFavoriteItem(item),
      surface,
    }))
    .filter((item) => !(alertSettings?.[item.itemId] || []).length)
    .slice(0, limit);
}

export function buildFavoriteChannelPanelModel({
  favorites,
  locale,
  dictionary,
  platform,
  geo,
  itemLimit = 3,
} = {}) {
  const actions = (platform?.funnel?.actions || [])
    .filter((action) => action.url && isGeoAllowed(geo, action.enabledGeos))
    .map((action) => ({
      key: action.key,
      href: action.url,
      label:
        action.key === "telegram"
          ? dictionary.openTelegram
          : action.key === "whatsapp"
            ? dictionary.openWhatsApp
            : action.label || action.key,
    }));

  return {
    geoLabel: getGeoLabel(geo),
    actions,
    items: buildFavoriteSurfaceItems(favorites, locale, dictionary).slice(0, itemLimit),
  };
}
