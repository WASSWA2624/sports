import { unstable_cache } from "next/cache";
import { safeDataRead } from "../data-access";
import { db } from "../db";
import {
  decorateNewsArticle,
  groupNewsHubArticles,
} from "./news";

function articleInclude() {
  return {
    category: true,
    entityLinks: {
      orderBy: [{ entityType: "asc" }, { createdAt: "asc" }],
    },
  };
}

function fixtureNewsInclude() {
  return {
    league: {
      select: {
        id: true,
        code: true,
        name: true,
        country: true,
      },
    },
    homeTeam: {
      select: {
        id: true,
        name: true,
        shortName: true,
        code: true,
      },
    },
    awayTeam: {
      select: {
        id: true,
        name: true,
        shortName: true,
        code: true,
      },
    },
    resultSnapshot: true,
  };
}

function buildPublishedWhere() {
  return {
    status: "PUBLISHED",
    OR: [{ publishedAt: null }, { publishedAt: { lte: new Date() } }],
  };
}

function buildArticleWhere(where = {}, publishedOnly = true) {
  if (!publishedOnly) {
    return where;
  }

  if (!where || Object.keys(where).length === 0) {
    return buildPublishedWhere();
  }

  return {
    AND: [buildPublishedWhere(), where],
  };
}

function groupIdsByType(articles) {
  return articles.reduce(
    (accumulator, article) => {
      for (const link of article.entityLinks || []) {
        accumulator[link.entityType].add(link.entityId);
      }

      return accumulator;
    },
    {
      SPORT: new Set(),
      COUNTRY: new Set(),
      COMPETITION: new Set(),
      TEAM: new Set(),
      FIXTURE: new Set(),
    }
  );
}

async function loadEntityMaps(articles) {
  const grouped = groupIdsByType(articles);
  const [sports, countries, competitions, teams, fixtures] = await Promise.all([
    grouped.SPORT.size
      ? db.sport.findMany({
          where: { id: { in: [...grouped.SPORT] } },
          select: { id: true, code: true, slug: true, name: true },
        })
      : Promise.resolve([]),
    grouped.COUNTRY.size
      ? db.country.findMany({
          where: { id: { in: [...grouped.COUNTRY] } },
          select: { id: true, code: true, slug: true, name: true },
        })
      : Promise.resolve([]),
    grouped.COMPETITION.size
      ? db.competition.findMany({
          where: { id: { in: [...grouped.COMPETITION] } },
          select: {
            id: true,
            code: true,
            slug: true,
            name: true,
            shortName: true,
          },
        })
      : Promise.resolve([]),
    grouped.TEAM.size
      ? db.team.findMany({
          where: { id: { in: [...grouped.TEAM] } },
          select: {
            id: true,
            code: true,
            name: true,
            shortName: true,
            league: {
              select: {
                code: true,
                name: true,
              },
            },
          },
        })
      : Promise.resolve([]),
    grouped.FIXTURE.size
      ? db.fixture.findMany({
          where: { id: { in: [...grouped.FIXTURE] } },
          include: fixtureNewsInclude(),
        })
      : Promise.resolve([]),
  ]);

  return {
    SPORT: new Map(sports.map((entry) => [entry.id, entry])),
    COUNTRY: new Map(countries.map((entry) => [entry.id, entry])),
    COMPETITION: new Map(competitions.map((entry) => [entry.id, entry])),
    TEAM: new Map(teams.map((entry) => [entry.id, entry])),
    FIXTURE: new Map(fixtures.map((entry) => [entry.id, entry])),
  };
}

async function hydrateArticles(articles) {
  if (!articles.length) {
    return [];
  }

  const entityMaps = await loadEntityMaps(articles);

  return articles.map((article) =>
    decorateNewsArticle({
      ...article,
      entityLinks: (article.entityLinks || []).map((link) => ({
        ...link,
        entity: entityMaps[link.entityType]?.get(link.entityId) || null,
      })),
    })
  );
}

async function fetchArticles({
  where = {},
  take = 12,
  publishedOnly = true,
  orderBy = [{ publishedAt: "desc" }, { updatedAt: "desc" }],
} = {}) {
  const articles = await db.newsArticle.findMany({
    where: buildArticleWhere(where, publishedOnly),
    orderBy,
    take,
    include: articleInclude(),
  });

  return hydrateArticles(articles);
}

async function fetchArticlesByEntityLinks(clauses = [], take = 6, publishedOnly = true) {
  if (!clauses.length) {
    return [];
  }

  const linkRows = await db.articleEntityLink.findMany({
    where: {
      OR: clauses,
    },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: Math.max(take * 6, take),
    select: {
      articleId: true,
    },
  });

  const articleIds = [...new Set(linkRows.map((row) => row.articleId).filter(Boolean))];

  if (!articleIds.length) {
    return [];
  }

  return fetchArticles({
    where: {
      id: {
        in: articleIds,
      },
    },
    take,
    publishedOnly,
  });
}

export const getNewsHubSnapshot = unstable_cache(
  async () =>
    safeDataRead(async () => {
      const articles = await fetchArticles({ take: 24 });
      return groupNewsHubArticles(articles);
    }, groupNewsHubArticles([])),
  ["news:hub"],
  { revalidate: 300, tags: ["news:hub", "news:articles"] }
);

export const getHomepageNewsModule = unstable_cache(
  async () =>
    safeDataRead(async () => {
      const hub = await getNewsHubSnapshot();
      const articles = (hub.homepage.length ? hub.homepage : hub.items).slice(0, 4);
      return {
        articles,
        total: hub.items.length,
      };
    }, { articles: [], total: 0 }),
  ["news:homepage"],
  { revalidate: 300, tags: ["news:hub", "news:articles"] }
);

export const getLatestNewsModule = unstable_cache(
  async () =>
    safeDataRead(async () => {
      const hub = await getNewsHubSnapshot();
      const articles = (hub.latest.length ? hub.latest : hub.items).slice(0, 4);
      return {
        articles,
        total: hub.items.length,
      };
    }, { articles: [], total: 0 }),
  ["news:latest"],
  { revalidate: 300, tags: ["news:articles"] }
);

export async function getSportNewsModule(sportId, take = 6) {
  if (!sportId) {
    return { articles: [], total: 0 };
  }

  const articles = await safeDataRead(
    () =>
      fetchArticlesByEntityLinks(
        [
          {
            entityType: "SPORT",
            entityId: sportId,
          },
        ],
        take
      ),
    []
  );

  return {
    articles,
    total: articles.length,
  };
}

export async function getCompetitionNewsModule(competitionId, take = 4) {
  if (!competitionId) {
    return { articles: [], total: 0 };
  }

  const articles = await safeDataRead(
    () =>
      fetchArticlesByEntityLinks(
        [
          {
            entityType: "COMPETITION",
            entityId: competitionId,
          },
        ],
        take
      ),
    []
  );

  return {
    articles,
    total: articles.length,
  };
}

export async function getCountryNewsModule(countryId, take = 4) {
  if (!countryId) {
    return { articles: [], total: 0 };
  }

  const articles = await safeDataRead(
    () =>
      fetchArticlesByEntityLinks(
        [
          {
            entityType: "COUNTRY",
            entityId: countryId,
          },
        ],
        take
      ),
    []
  );

  return {
    articles,
    total: articles.length,
  };
}

export async function getTeamNewsModule(teamId, take = 4) {
  if (!teamId) {
    return { articles: [], total: 0 };
  }

  const articles = await safeDataRead(
    () =>
      fetchArticlesByEntityLinks(
        [
          {
            entityType: "TEAM",
            entityId: teamId,
          },
        ],
        take
      ),
    []
  );

  return {
    articles,
    total: articles.length,
  };
}

export async function getFixtureNewsModule(
  { fixtureId, competitionId, teamIds = [] } = {},
  take = 4
) {
  const predicates = [
    fixtureId
      ? {
          entityLinks: {
            some: {
              entityType: "FIXTURE",
              entityId: fixtureId,
            },
          },
        }
      : null,
    competitionId
      ? {
          entityLinks: {
            some: {
              entityType: "COMPETITION",
              entityId: competitionId,
            },
          },
        }
      : null,
    ...teamIds
      .filter(Boolean)
      .map((teamId) => ({
        entityLinks: {
          some: {
            entityType: "TEAM",
            entityId: teamId,
          },
        },
      })),
  ].filter(Boolean);

  if (!predicates.length) {
    return { articles: [], total: 0 };
  }

  const articles = await safeDataRead(
    () => fetchArticlesByEntityLinks(predicates, take),
    []
  );

  return {
    articles,
    total: articles.length,
  };
}

export async function getNewsArticleDetail(slug, { includeUnpublished = false } = {}) {
  const article = await safeDataRead(
    () =>
      db.newsArticle.findFirst({
        where: buildArticleWhere({ slug }, !includeUnpublished),
        include: articleInclude(),
      }),
    null
  );

  if (!article) {
    return null;
  }

  const [decoratedArticle] = await hydrateArticles([article]);
  const relatedPredicates = [];

  if (article.categoryId) {
    relatedPredicates.push({ categoryId: article.categoryId });
  }

  for (const link of article.entityLinks || []) {
    relatedPredicates.push({
      entityLinks: {
        some: {
          entityType: link.entityType,
          entityId: link.entityId,
        },
      },
    });
  }

  const relatedArticles = relatedPredicates.length
    ? await safeDataRead(
        () =>
          fetchArticles({
            where: {
              NOT: { id: article.id },
              OR: relatedPredicates,
            },
            take: 4,
          }),
        []
      )
    : [];

  return {
    article: decoratedArticle,
    relatedArticles,
  };
}

export async function getEditorialNewsWorkspace() {
  return safeDataRead(async () => {
    const [rawArticles, categories, sports, countries, competitions, teams, fixtures] = await Promise.all([
      db.newsArticle.findMany({
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
        take: 48,
        include: articleInclude(),
      }),
      db.newsCategory.findMany({
        orderBy: { name: "asc" },
      }),
      db.sport.findMany({
        where: { isEnabled: true },
        orderBy: { name: "asc" },
        select: { id: true, code: true, name: true },
      }),
      db.country.findMany({
        orderBy: { name: "asc" },
        take: 24,
        select: { id: true, code: true, slug: true, name: true },
      }),
      db.competition.findMany({
        orderBy: { name: "asc" },
        take: 24,
        select: {
          id: true,
          code: true,
          slug: true,
          name: true,
          shortName: true,
        },
      }),
      db.team.findMany({
        orderBy: { name: "asc" },
        take: 32,
        select: {
          id: true,
          code: true,
          name: true,
          shortName: true,
          league: {
            select: {
              name: true,
              code: true,
            },
          },
        },
      }),
      db.fixture.findMany({
        orderBy: [{ startsAt: "desc" }],
        take: 16,
        include: fixtureNewsInclude(),
      }),
    ]);

    const issueMap = new Map();
    const articleIssues = rawArticles.length
      ? await db.opsIssue.findMany({
          where: {
            articleId: {
              in: rawArticles.map((article) => article.id),
            },
            status: {
              notIn: ["RESOLVED", "DISMISSED"],
            },
          },
          orderBy: [{ updatedAt: "desc" }],
          select: {
            id: true,
            articleId: true,
            issueType: true,
            status: true,
            priority: true,
            title: true,
            updatedAt: true,
          },
        })
      : [];

    for (const issue of articleIssues) {
      if (!issueMap.has(issue.articleId)) {
        issueMap.set(issue.articleId, []);
      }

      issueMap.get(issue.articleId).push(issue);
    }

    const articles = (await hydrateArticles(rawArticles)).map((article) => ({
      ...article,
      openIssues: issueMap.get(article.id) || [],
      openIssueCount: issueMap.get(article.id)?.length || 0,
    }));

    return {
      articles,
      categories,
      options: {
        sports,
        countries,
        competitions,
        teams,
        fixtures,
      },
      summary: articles.reduce(
        (accumulator, article) => {
          accumulator.total += 1;
          accumulator[article.status] += 1;
          return accumulator;
        },
        {
          total: 0,
          DRAFT: 0,
          PUBLISHED: 0,
          ARCHIVED: 0,
        }
      ),
    };
  }, {
    articles: [],
    categories: [],
    options: {
      sports: [],
      countries: [],
      competitions: [],
      teams: [],
      fixtures: [],
    },
    summary: {
      total: 0,
      DRAFT: 0,
      PUBLISHED: 0,
      ARCHIVED: 0,
    },
  });
}

export async function getPublishedNewsFeed(limit = 12) {
  return safeDataRead(() => fetchArticles({ take: limit }), []);
}
