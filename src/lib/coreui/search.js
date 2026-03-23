import { db } from "../db";
import { buildCompetitionHref, buildMatchHref, buildTeamHref } from "./routes";

const DEFAULT_LIMIT_PER_SECTION = 6;
const SEARCH_SECTION_KEYS = ["competitions", "teams", "matches", "players", "articles"];

function normalizeSearchText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function normalizeSearchQuery(query) {
  return normalizeSearchText(query).slice(0, 120);
}

function tokenizeSearchQuery(query) {
  return normalizeSearchQuery(query)
    .split(/\s+/)
    .filter(Boolean);
}

function compareResultTitles(left, right) {
  return (left.title || "").localeCompare(right.title || "");
}

function buildFieldScore(query, fields = []) {
  const normalizedQuery = normalizeSearchQuery(query);
  const tokens = tokenizeSearchQuery(query);

  if (!normalizedQuery) {
    return 0;
  }

  return fields.reduce((highestScore, value) => {
    const normalizedField = normalizeSearchText(value);

    if (!normalizedField) {
      return highestScore;
    }

    let score = 0;

    if (normalizedField === normalizedQuery) {
      score += 180;
    } else if (normalizedField.startsWith(normalizedQuery)) {
      score += 130;
    } else if (normalizedField.includes(normalizedQuery)) {
      score += 90;
    }

    for (const token of tokens) {
      if (normalizedField === token) {
        score += 40;
        continue;
      }

      if (normalizedField.startsWith(token)) {
        score += 24;
        continue;
      }

      if (normalizedField.includes(token)) {
        score += 12;
      }
    }

    return Math.max(highestScore, score);
  }, 0);
}

function compareSearchItems(left, right) {
  if (right.score !== left.score) {
    return right.score - left.score;
  }

  return compareResultTitles(left, right);
}

function buildEmptySearchResult(query = "") {
  return {
    query,
    topResults: [],
    sections: Object.fromEntries(SEARCH_SECTION_KEYS.map((key) => [key, []])),
    summary: {
      total: 0,
      counts: Object.fromEntries(SEARCH_SECTION_KEYS.map((key) => [key, 0])),
    },
  };
}

function mapCompetitionResult(league, locale, query) {
  const score =
    buildFieldScore(query, [
      league.name,
      league.code,
      league.country,
      league.competition?.name,
      league.competition?.shortName,
    ]) +
    (league.isActive ? 20 : 0) +
    ((league.fixtures || []).length ? 12 : 0);

  return {
    id: league.id,
    key: `competition:${league.id}`,
    type: "competition",
    title: league.competition?.name || league.name,
    subtitle: [league.country, league.competition?.shortName || league.code]
      .filter(Boolean)
      .join(" • "),
    href: buildCompetitionHref(locale, league),
    itemId: league.code ? `competition:${league.code}` : null,
    score,
  };
}

function mapTeamResult(team, locale, query) {
  const score =
    buildFieldScore(query, [
      team.name,
      team.shortName,
      team.code,
      team.league?.name,
      team.competition?.name,
    ]) +
    (team.homeFor?.[0] || team.awayFor?.[0] ? 16 : 0);

  return {
    id: team.id,
    key: `team:${team.id}`,
    type: "team",
    title: team.name,
    subtitle: [
      team.shortName || team.code,
      team.league?.name || team.competition?.name,
    ]
      .filter(Boolean)
      .join(" • "),
    href: buildTeamHref(locale, team),
    itemId: `team:${team.id}`,
    score,
  };
}

function pickPlayerContext(player) {
  const lineupContext = player.lineupEntries?.[0];
  if (lineupContext?.fixture) {
    return {
      fixture: lineupContext.fixture,
      team: lineupContext.team || null,
    };
  }

  const participantContext = player.participants?.[0];
  if (participantContext?.fixture) {
    return {
      fixture: participantContext.fixture,
      team: participantContext.team || null,
    };
  }

  return {
    fixture: null,
    team: null,
  };
}

function mapPlayerResult(player, locale, query) {
  const context = pickPlayerContext(player);
  const href = context.fixture
    ? buildMatchHref(locale, context.fixture)
    : context.team
      ? buildTeamHref(locale, context.team)
      : null;
  const score =
    buildFieldScore(query, [player.name, player.shortName, player.countryName, context.team?.name]) +
    (href ? 10 : 0);

  return {
    id: player.id,
    key: `player:${player.id}`,
    type: "player",
    title: player.name,
    subtitle: [
      context.team?.name,
      context.fixture
        ? `${context.fixture.homeTeam?.name || "Home"} vs ${context.fixture.awayTeam?.name || "Away"}`
        : player.countryName,
    ]
      .filter(Boolean)
      .join(" • "),
    href,
    itemId: null,
    score,
  };
}

function mapMatchResult(fixture, locale, query) {
  const statusBonus =
    fixture.status === "LIVE" ? 40 : fixture.status === "SCHEDULED" ? 20 : fixture.status === "FINISHED" ? 10 : 0;
  const score =
    buildFieldScore(query, [
      fixture.homeTeam?.name,
      fixture.awayTeam?.name,
      fixture.league?.name,
      fixture.round,
      fixture.externalRef,
    ]) + statusBonus;

  return {
    id: fixture.id,
    key: `match:${fixture.id}`,
    type: "match",
    title: `${fixture.homeTeam?.name || "Home"} vs ${fixture.awayTeam?.name || "Away"}`,
    subtitle: [fixture.league?.name, fixture.status].filter(Boolean).join(" • "),
    href: buildMatchHref(locale, fixture),
    itemId: `fixture:${fixture.id}`,
    score,
  };
}

function mapArticleResult(article, locale, query) {
  const publishedAtScore = article.publishedAt
    ? Math.max(
        0,
        20 - Math.floor((Date.now() - new Date(article.publishedAt).getTime()) / (1000 * 60 * 60 * 12))
      )
    : 0;
  const score =
    buildFieldScore(query, [article.title, article.excerpt, article.category?.name]) + publishedAtScore;

  return {
    id: article.id,
    key: `article:${article.id}`,
    type: "article",
    title: article.title,
    subtitle: [article.category?.name, article.excerpt].filter(Boolean).join(" • "),
    href: `/${locale}/news/${article.slug}`,
    itemId: null,
    score,
  };
}

async function searchCompetitions(query, locale, limitPerSection) {
  const leagues = await db.league.findMany({
    where: {
      isActive: true,
      OR: [
        { name: { contains: query } },
        { code: { contains: String(query || "").toUpperCase() } },
        { country: { contains: query } },
        { competition: { is: { name: { contains: query } } } },
        { competition: { is: { shortName: { contains: query } } } },
      ],
    },
    orderBy: [{ name: "asc" }],
    take: limitPerSection * 3,
    include: {
      competition: true,
      fixtures: {
        orderBy: [{ startsAt: "asc" }],
        take: 1,
        select: {
          id: true,
        },
      },
    },
  });

  return leagues
    .map((league) => mapCompetitionResult(league, locale, query))
    .sort(compareSearchItems)
    .slice(0, limitPerSection);
}

async function searchTeams(query, locale, limitPerSection) {
  const teams = await db.team.findMany({
    where: {
      OR: [
        { name: { contains: query } },
        { shortName: { contains: query } },
        { code: { contains: String(query || "").toUpperCase() } },
        { league: { is: { name: { contains: query } } } },
        { competition: { is: { name: { contains: query } } } },
      ],
    },
    orderBy: [{ name: "asc" }],
    take: limitPerSection * 3,
    include: {
      league: {
        select: {
          code: true,
          name: true,
        },
      },
      competition: {
        select: {
          id: true,
          name: true,
          shortName: true,
        },
      },
      homeFor: {
        orderBy: [{ startsAt: "asc" }],
        take: 1,
        select: {
          id: true,
        },
      },
      awayFor: {
        orderBy: [{ startsAt: "asc" }],
        take: 1,
        select: {
          id: true,
        },
      },
    },
  });

  return teams
    .map((team) => mapTeamResult(team, locale, query))
    .sort(compareSearchItems)
    .slice(0, limitPerSection);
}

async function searchMatches(query, locale, limitPerSection) {
  const fixtures = await db.fixture.findMany({
    where: {
      OR: [
        { round: { contains: query } },
        { externalRef: { contains: query } },
        { league: { is: { name: { contains: query } } } },
        { homeTeam: { is: { name: { contains: query } } } },
        { awayTeam: { is: { name: { contains: query } } } },
      ],
    },
    orderBy: [{ startsAt: "asc" }],
    take: limitPerSection * 3,
    include: {
      league: {
        select: {
          code: true,
          name: true,
        },
      },
      homeTeam: {
        select: {
          id: true,
          name: true,
          shortName: true,
        },
      },
      awayTeam: {
        select: {
          id: true,
          name: true,
          shortName: true,
        },
      },
    },
  });

  return fixtures
    .map((fixture) => mapMatchResult(fixture, locale, query))
    .sort(compareSearchItems)
    .slice(0, limitPerSection);
}

async function searchPlayers(query, locale, limitPerSection) {
  const players = await db.player.findMany({
    where: {
      OR: [
        { name: { contains: query } },
        { shortName: { contains: query } },
        { countryName: { contains: query } },
      ],
    },
    orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
    take: limitPerSection * 3,
    include: {
      lineupEntries: {
        orderBy: [{ updatedAt: "desc" }],
        take: 1,
        include: {
          team: {
            select: {
              id: true,
              name: true,
            },
          },
          fixture: {
            select: {
              id: true,
              externalRef: true,
              homeTeam: {
                select: {
                  name: true,
                },
              },
              awayTeam: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      },
      participants: {
        orderBy: [{ updatedAt: "desc" }],
        take: 1,
        include: {
          team: {
            select: {
              id: true,
              name: true,
            },
          },
          fixture: {
            select: {
              id: true,
              externalRef: true,
              homeTeam: {
                select: {
                  name: true,
                },
              },
              awayTeam: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return players
    .map((player) => mapPlayerResult(player, locale, query))
    .sort(compareSearchItems)
    .slice(0, limitPerSection);
}

async function searchArticles(query, locale, limitPerSection) {
  const articles = await db.newsArticle.findMany({
    where: {
      status: "PUBLISHED",
      OR: [{ publishedAt: null }, { publishedAt: { lte: new Date() } }],
      AND: [
        {
          OR: [
            { title: { contains: query } },
            { excerpt: { contains: query } },
            { category: { is: { name: { contains: query } } } },
          ],
        },
      ],
    },
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
    take: limitPerSection * 3,
    include: {
      category: {
        select: {
          name: true,
        },
      },
    },
  });

  return articles
    .map((article) => mapArticleResult(article, locale, query))
    .sort(compareSearchItems)
    .slice(0, limitPerSection);
}

function buildSearchSummary(sections) {
  const counts = Object.fromEntries(
    SEARCH_SECTION_KEYS.map((key) => [key, sections[key]?.length || 0])
  );

  return {
    total: Object.values(counts).reduce((total, count) => total + count, 0),
    counts,
  };
}

export async function searchGlobal(query, { locale = "en", limitPerSection = DEFAULT_LIMIT_PER_SECTION } = {}) {
  const normalizedQuery = normalizeSearchQuery(query);

  if (normalizedQuery.length < 2) {
    return buildEmptySearchResult(normalizedQuery);
  }

  const [competitions, teams, matches, players, articles] = await Promise.all([
    searchCompetitions(normalizedQuery, locale, limitPerSection),
    searchTeams(normalizedQuery, locale, limitPerSection),
    searchMatches(normalizedQuery, locale, limitPerSection),
    searchPlayers(normalizedQuery, locale, limitPerSection),
    searchArticles(normalizedQuery, locale, limitPerSection),
  ]);

  const sections = {
    competitions,
    teams,
    matches,
    players,
    articles,
  };
  const topResults = Object.values(sections)
    .flat()
    .sort(compareSearchItems)
    .slice(0, Math.min(12, limitPerSection * 2));

  return {
    query: normalizedQuery,
    topResults,
    sections,
    summary: buildSearchSummary(sections),
  };
}
