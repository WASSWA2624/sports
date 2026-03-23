import { getCurrentUserFromServer } from "./auth";
import { buildAlertSettingsMap, mergeAlertSettings } from "./alerts";
import { db } from "./db";
import { formatFavoriteItemId, parseFavoriteItemId } from "./favorites";
import { getPreferenceSnapshot } from "./coreui/preferences-server";

const FAVORITE_FIXTURE_WEIGHT = 1200;
const FAVORITE_TEAM_WEIGHT = 420;
const FAVORITE_COMPETITION_WEIGHT = 280;
const RECENT_FIXTURE_WEIGHT = 180;
const RECENT_TEAM_WEIGHT = 80;
const RECENT_COMPETITION_WEIGHT = 60;

function buildFixtureInclude() {
  return {
    league: true,
    season: true,
    homeTeam: true,
    awayTeam: true,
    resultSnapshot: true,
  };
}

function mergeOrderedItems(...collections) {
  return [...new Set(collections.flat().filter(Boolean))];
}

function buildRecentWeightMap(itemIds = []) {
  const size = itemIds.length;

  return itemIds.reduce((accumulator, itemId, index) => {
    accumulator.set(itemId, Math.max(1, size - index));
    return accumulator;
  }, new Map());
}

function buildFavoriteSets(itemIds = []) {
  return itemIds.reduce(
    (accumulator, itemId) => {
      try {
        const favorite = parseFavoriteItemId(itemId);

        if (favorite.entityType === "FIXTURE") {
          accumulator.fixtures.add(favorite.entityId);
        }

        if (favorite.entityType === "TEAM") {
          accumulator.teams.add(favorite.entityId);
        }

        if (favorite.entityType === "COMPETITION") {
          accumulator.competitions.add(favorite.entityId);
        }
      } catch (error) {
        return accumulator;
      }

      return accumulator;
    },
    {
      fixtures: new Set(),
      teams: new Set(),
      competitions: new Set(),
    }
  );
}

function getCompetitionReference(entity) {
  return entity?.competitionCode || entity?.league?.code || entity?.leagueCode || entity?.code || null;
}

function getPreparedPersonalizationState(personalization) {
  return {
    favoriteSets:
      personalization?.favoriteSets || buildFavoriteSets(personalization?.favoriteIds || []),
    recentWeightMap:
      personalization?.recentWeightMap ||
      buildRecentWeightMap(personalization?.recentViewIds || []),
  };
}

function getRecentMatchWeight(weightMap, itemId) {
  return (weightMap.get(itemId) || 0) * RECENT_FIXTURE_WEIGHT;
}

function getRecentTeamWeight(weightMap, teamId) {
  return (weightMap.get(`team:${teamId}`) || 0) * RECENT_TEAM_WEIGHT;
}

function getRecentCompetitionWeight(weightMap, competitionCode) {
  return (weightMap.get(`competition:${competitionCode}`) || 0) * RECENT_COMPETITION_WEIGHT;
}

export async function getPersonalizationSnapshot() {
  const [preferences, userContext] = await Promise.all([
    getPreferenceSnapshot(),
    getCurrentUserFromServer(),
  ]);

  const localFavorites = preferences.watchlist || [];
  const localAlerts = preferences.alertSettings || {};
  const localRecentViews = preferences.recentViews || [];

  if (!userContext) {
    const favoriteIds = localFavorites;
    const recentViewIds = localRecentViews;

    return {
      userContext: null,
      favoriteIds,
      alertSettings: localAlerts,
      recentViewIds,
      favoriteSets: buildFavoriteSets(favoriteIds),
      recentWeightMap: buildRecentWeightMap(recentViewIds),
    };
  }

  const [favorites, subscriptions, recentViews] = await Promise.all([
    db.favoriteEntity.findMany({
      where: { userId: userContext.user.id },
      orderBy: { createdAt: "desc" },
    }),
    db.notificationSubscription.findMany({
      where: {
        userId: userContext.user.id,
        isEnabled: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    db.recentView.findMany({
      where: { userId: userContext.user.id },
      orderBy: { viewedAt: "desc" },
      take: 20,
    }),
  ]);

  const remoteFavorites = favorites.map((item) => formatFavoriteItemId(item)).filter(Boolean);
  const remoteAlerts = buildAlertSettingsMap(subscriptions);
  const remoteRecentViews = recentViews.map((item) => formatFavoriteItemId(item)).filter(Boolean);

  const favoriteIds = mergeOrderedItems(localFavorites, remoteFavorites);
  const recentViewIds = mergeOrderedItems(localRecentViews, remoteRecentViews);

  return {
    userContext,
    favoriteIds,
    alertSettings: mergeAlertSettings(localAlerts, remoteAlerts),
    recentViewIds,
    favoriteSets: buildFavoriteSets(favoriteIds),
    recentWeightMap: buildRecentWeightMap(recentViewIds),
  };
}

export function getFixturePersonalizationScore(fixture, personalization) {
  if (!fixture) {
    return 0;
  }

  const { favoriteSets, recentWeightMap } = getPreparedPersonalizationState(personalization);
  const itemId = formatFavoriteItemId({ entityType: "FIXTURE", entityId: fixture.id });
  const competitionCode = getCompetitionReference(fixture);
  let score = 0;

  if (favoriteSets.fixtures.has(fixture.id)) {
    score += FAVORITE_FIXTURE_WEIGHT;
  }

  if (favoriteSets.teams.has(fixture.homeTeamId || fixture.homeTeam?.id)) {
    score += FAVORITE_TEAM_WEIGHT;
  }

  if (favoriteSets.teams.has(fixture.awayTeamId || fixture.awayTeam?.id)) {
    score += FAVORITE_TEAM_WEIGHT;
  }

  if (competitionCode && favoriteSets.competitions.has(competitionCode)) {
    score += FAVORITE_COMPETITION_WEIGHT;
  }

  score += getRecentMatchWeight(recentWeightMap, itemId);
  score += getRecentTeamWeight(recentWeightMap, fixture.homeTeamId || fixture.homeTeam?.id);
  score += getRecentTeamWeight(recentWeightMap, fixture.awayTeamId || fixture.awayTeam?.id);

  if (competitionCode) {
    score += getRecentCompetitionWeight(recentWeightMap, competitionCode);
  }

  return score;
}

export function getCompetitionPersonalizationScore(competition, personalization) {
  const { favoriteSets, recentWeightMap } = getPreparedPersonalizationState(personalization);
  const competitionCode = getCompetitionReference(competition);

  if (!competitionCode) {
    return 0;
  }

  let score = 0;

  if (favoriteSets.competitions.has(competitionCode)) {
    score += FAVORITE_COMPETITION_WEIGHT;
  }

  score += getRecentCompetitionWeight(recentWeightMap, competitionCode);

  for (const fixture of competition?.fixtures || []) {
    score = Math.max(score, getFixturePersonalizationScore(fixture, personalization));
  }

  return score;
}

export function getTeamPersonalizationScore(team, personalization) {
  const { favoriteSets, recentWeightMap } = getPreparedPersonalizationState(personalization);
  const teamId = team?.id || null;
  const competitionCode = getCompetitionReference(team);
  let score = 0;

  if (!teamId) {
    return score;
  }

  if (favoriteSets.teams.has(teamId)) {
    score += FAVORITE_TEAM_WEIGHT;
  }

  score += getRecentTeamWeight(recentWeightMap, teamId);

  if (competitionCode && favoriteSets.competitions.has(competitionCode)) {
    score += FAVORITE_COMPETITION_WEIGHT / 2;
  }

  if (competitionCode) {
    score += getRecentCompetitionWeight(recentWeightMap, competitionCode);
  }

  return score;
}

export function sortByPersonalization(items = [], scoreFn, fallbackFn) {
  return [...items].sort((left, right) => {
    const rightScore = scoreFn(right);
    const leftScore = scoreFn(left);

    if (rightScore !== leftScore) {
      return rightScore - leftScore;
    }

    return fallbackFn(left, right);
  });
}

export function sortFixturesByPersonalization(fixtures = [], personalization, fallbackFn) {
  return sortByPersonalization(
    fixtures,
    (fixture) => getFixturePersonalizationScore(fixture, personalization),
    fallbackFn
  );
}

export function sortCompetitionsByPersonalization(items = [], personalization, fallbackFn) {
  return sortByPersonalization(
    items,
    (item) => getCompetitionPersonalizationScore(item, personalization),
    fallbackFn
  );
}

export function sortTeamsByPersonalization(items = [], personalization, fallbackFn) {
  return sortByPersonalization(
    items,
    (item) => getTeamPersonalizationScore(item, personalization),
    fallbackFn
  );
}

export function getPersonalizationUsage(personalization) {
  return {
    hasFavorites: Boolean(personalization?.favoriteIds?.length),
    hasRecentViews: Boolean(personalization?.recentViewIds?.length),
    favoriteCount: personalization?.favoriteIds?.length || 0,
    recentViewCount: personalization?.recentViewIds?.length || 0,
  };
}

export async function getFavoritesPageData(personalization) {
  const favoriteIds = personalization?.favoriteIds || [];
  const favoriteOrder = new Map(favoriteIds.map((itemId, index) => [itemId, index]));
  const groupedFavorites = favoriteIds.reduce(
    (accumulator, itemId) => {
      try {
        const favorite = parseFavoriteItemId(itemId);

        if (favorite.entityType === "FIXTURE") {
          accumulator.fixtures.push(favorite.entityId);
        }

        if (favorite.entityType === "TEAM") {
          accumulator.teams.push(favorite.entityId);
        }

        if (favorite.entityType === "COMPETITION") {
          accumulator.competitions.push(favorite.entityId);
        }
      } catch (error) {
        return accumulator;
      }

      return accumulator;
    },
    { fixtures: [], teams: [], competitions: [] }
  );

  const [fixtures, teams, competitions] = await Promise.all([
    groupedFavorites.fixtures.length
      ? db.fixture.findMany({
          where: {
            id: {
              in: groupedFavorites.fixtures,
            },
          },
          include: buildFixtureInclude(),
        })
      : Promise.resolve([]),
    groupedFavorites.teams.length
      ? db.team.findMany({
          where: {
            id: {
              in: groupedFavorites.teams,
            },
          },
          include: {
            league: {
              select: {
                code: true,
                name: true,
                country: true,
              },
            },
            homeFor: {
              orderBy: { startsAt: "asc" },
              take: 3,
              include: buildFixtureInclude(),
            },
            awayFor: {
              orderBy: { startsAt: "asc" },
              take: 3,
              include: buildFixtureInclude(),
            },
          },
        })
      : Promise.resolve([]),
    groupedFavorites.competitions.length
      ? db.league.findMany({
          where: {
            code: {
              in: groupedFavorites.competitions,
            },
          },
          include: {
            teams: {
              take: 4,
              orderBy: { name: "asc" },
              select: {
                id: true,
                name: true,
              },
            },
            seasons: {
              where: { isCurrent: true },
              take: 1,
              select: {
                name: true,
              },
            },
            fixtures: {
              orderBy: { startsAt: "asc" },
              take: 3,
              include: buildFixtureInclude(),
            },
          },
        })
      : Promise.resolve([]),
  ]);

  const teamsWithFixtures = teams.map((team) => {
    const fixtures = [...team.homeFor, ...team.awayFor].sort(
      (left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime()
    );

    return {
      ...team,
      fixtures,
      nextFixture: fixtures.find((fixture) => ["LIVE", "SCHEDULED"].includes(fixture.status)) || null,
      latestFixture:
        [...fixtures]
          .sort((left, right) => new Date(right.startsAt).getTime() - new Date(left.startsAt).getTime())[0] ||
        null,
    };
  });

  const orderByFavorites = (items, itemIdResolver) =>
    [...items].sort(
      (left, right) =>
        (favoriteOrder.get(itemIdResolver(left)) ?? Number.MAX_SAFE_INTEGER) -
        (favoriteOrder.get(itemIdResolver(right)) ?? Number.MAX_SAFE_INTEGER)
    );

  return {
    fixtures: orderByFavorites(fixtures, (item) => `fixture:${item.id}`),
    teams: orderByFavorites(teamsWithFixtures, (item) => `team:${item.id}`),
    competitions: orderByFavorites(competitions, (item) => `competition:${item.code}`),
  };
}
