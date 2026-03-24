import { safeDataRead } from "../data-access";
import { db } from "../db";
import { getPlatformPublicSnapshotData } from "../platform/env";
import { getDictionary } from "./dictionaries";
import { getFixtureDetail, getLeagueDetail } from "./read";
import {
  appendRouteContext,
  DEFAULT_MARKET_GEO,
  getGeoLabel,
  isGeoAllowed,
  normalizeGeo,
} from "./route-context";
import {
  buildCompetitionHref,
  buildMatchHref,
  buildTeamHref,
} from "./routes";

const NEWS_SURFACE_KEY = "NEWS";

function normalizePromoPreference(value) {
  const normalized = String(value || "AUTO").trim().toUpperCase();
  return ["AUTO", "ODDS", "AFFILIATE", "FUNNEL", "DISABLED"].includes(normalized)
    ? normalized
    : "AUTO";
}

function rankAffiliateLink(link, targetGeo) {
  let score = 0;
  const linkGeo = normalizeGeo(link?.territory, DEFAULT_MARKET_GEO);

  if (linkGeo === targetGeo) {
    score += 100;
  } else if (linkGeo === DEFAULT_MARKET_GEO) {
    score += 24;
  }

  if (link?.surface === NEWS_SURFACE_KEY) {
    score += 20;
  } else if (!link?.surface || link?.surface === "SHELL") {
    score += 8;
  }

  if (link?.isDefault) {
    score += 10;
  }

  score += Math.max(0, 200 - Number(link?.priority || 100));
  return score;
}

function resolveAffiliateLink(links = [], targetGeo) {
  return [...links].sort((left, right) => rankAffiliateLink(right, targetGeo) - rankAffiliateLink(left, targetGeo))[0] || null;
}

function dedupeBy(items, getKey) {
  return [...new Map((items || []).map((item) => [getKey(item), item])).values()];
}

function buildAffiliateAction(link, { locale, geo, articleId = null }) {
  if (!link) {
    return null;
  }

  return {
    key: `affiliate:${link.id}`,
    href: link.destinationUrl || link.fallbackUrl || null,
    external: true,
    label: null,
    analyticsEvent: "odds_cta_click",
    analyticsAction: "news-affiliate-primary",
    affiliateClick: {
      affiliateLinkId: link.id,
      bookmakerId: link.bookmakerId || null,
      bookmaker:
        link.bookmaker?.shortName ||
        link.bookmaker?.name ||
        link.bookmaker?.code ||
        null,
      partner:
        link.bookmaker?.code ||
        link.bookmaker?.shortName ||
        link.bookmaker?.name ||
        link.code ||
        null,
      geo,
      locale,
      surface: NEWS_SURFACE_KEY,
      slotKey: "news:primary-affiliate",
      targetEntityType: articleId ? "ARTICLE" : null,
      targetEntityId: articleId,
    },
  };
}

function buildFallbackAffiliateAction(platform, { locale, geo }) {
  if (!platform?.affiliate?.partnerCodes?.length && !platform?.affiliate?.primaryPartner) {
    return null;
  }

  return {
    key: "affiliate:fallback",
    href: appendRouteContext(`/${locale}/affiliates`, { geo }),
    external: false,
    label: null,
    analyticsEvent: "odds_cta_click",
    analyticsAction: "news-affiliate-fallback",
    affiliateClick: null,
  };
}

function buildFunnelActions(entries = [], platform, dictionary, { geo }) {
  const dbBacked = entries
    .filter((entry) => entry?.ctaUrl && isGeoAllowed(geo, entry.enabledGeos || []))
    .map((entry) => ({
      key: `funnel:${entry.id}`,
      href: entry.ctaUrl,
      external: true,
      label:
        entry.ctaLabel ||
        (String(entry.channel || "").trim().toLowerCase() === "telegram"
          ? dictionary.openTelegram
          : dictionary.openWhatsApp),
      analyticsEvent: "funnel_cta_click",
      analyticsAction: `news-funnel:${String(entry.channel || entry.key || entry.id)
        .trim()
        .toLowerCase()}`,
      affiliateClick: null,
    }));

  if (dbBacked.length) {
    return dbBacked;
  }

  return (platform?.funnel?.actions || [])
    .filter((entry) => entry.url && isGeoAllowed(geo, entry.enabledGeos || []))
    .map((entry) => ({
      key: `funnel:${entry.key}`,
      href: entry.url,
      external: true,
      label: entry.key === "telegram" ? dictionary.openTelegram : dictionary.openWhatsApp,
      analyticsEvent: "funnel_cta_click",
      analyticsAction: `news-funnel:${entry.key}`,
      affiliateClick: null,
    }));
}

function buildInternalQuickLink(key, href, label) {
  if (!href || !label) {
    return null;
  }

  return {
    key,
    href,
    external: false,
    label,
    analyticsEvent: "news_article_click",
    analyticsAction: key,
    affiliateClick: null,
  };
}

export function buildNewsQuickLinks({
  locale,
  geo,
  dictionary,
  article = null,
  entityContext = {},
}) {
  const fixture = entityContext.fixture || article?.primaryFixture || article?.entities?.fixtures?.[0] || null;
  const competition =
    entityContext.competition ||
    article?.primaryCompetition ||
    article?.entities?.competitions?.[0] ||
    null;
  const team = entityContext.team || article?.primaryTeam || article?.entities?.teams?.[0] || null;
  const links = [
    fixture
      ? buildInternalQuickLink(
          "news-open-match",
          buildMatchHref(locale, fixture, { geo }),
          dictionary.liveBoardOpenCenter
        )
      : null,
    competition?.code
      ? buildInternalQuickLink(
          "news-open-competition",
          buildCompetitionHref(locale, competition, { geo }),
          competition.shortName || competition.name
        )
      : null,
    team?.id
      ? buildInternalQuickLink(
          "news-open-team",
          buildTeamHref(locale, team, { geo }),
          team.shortName || team.name
        )
      : null,
    buildInternalQuickLink(
      "news-open-live",
      appendRouteContext(`/${locale}/live`, { geo }),
      dictionary.liveNow
    ),
    buildInternalQuickLink(
      "news-open-results",
      appendRouteContext(`/${locale}/results`, { geo }),
      dictionary.results
    ),
    buildInternalQuickLink(
      "news-open-hub",
      appendRouteContext(`/${locale}/news`, { geo }),
      dictionary.news
    ),
  ].filter(Boolean);

  return dedupeBy(links, (entry) => entry.href).slice(0, 5);
}

export function buildNewsPromoModel({
  locale,
  geo,
  dictionary,
  article = null,
  entityContext = {},
  platform,
  affiliateLinks = [],
  funnelEntries = [],
  lead,
  title,
}) {
  const quickLinks = buildNewsQuickLinks({
    locale,
    geo,
    dictionary,
    article,
    entityContext,
  });
  const promoPreference = normalizePromoPreference(article?.promoPreference);
  const inlineCtaAllowed =
    article == null || (article.allowInlineCta !== false && article.ctaSafetyChecked !== false);
  const affiliateAction =
    buildAffiliateAction(resolveAffiliateLink(affiliateLinks, geo), {
      locale,
      geo,
      articleId: article?.id || null,
    }) || buildFallbackAffiliateAction(platform, { locale, geo });
  const funnelActions = buildFunnelActions(funnelEntries, platform, dictionary, { geo });
  const orderedActions =
    promoPreference === "FUNNEL"
      ? [...funnelActions, affiliateAction].filter((entry) => entry?.href)
      : [affiliateAction, ...funnelActions].filter((entry) => entry?.href);
  const primaryAction =
    inlineCtaAllowed && promoPreference !== "DISABLED" ? orderedActions[0] || null : null;
  const secondaryActions =
    inlineCtaAllowed && promoPreference !== "DISABLED"
      ? orderedActions
          .slice(1, 3)
          .map((entry) => ({
            ...entry,
            analyticsAction: `${entry.analyticsAction}:secondary`,
          }))
      : [];
  const bookmakers = dedupeBy(
    [
      ...(platform?.affiliate?.bookmakerByGeo?.[geo] || []),
      ...(platform?.affiliate?.bookmakerByGeo?.[DEFAULT_MARKET_GEO] || []),
      ...affiliateLinks.map(
        (link) =>
          link.bookmaker?.shortName ||
          link.bookmaker?.name ||
          link.bookmaker?.code ||
          null
      ),
    ].filter(Boolean),
    (entry) => entry
  ).slice(0, 5);

  return {
    title: title || dictionary.newsJourneyTitle,
    lead: lead || dictionary.newsJourneyLead,
    geoLabel: getGeoLabel(geo),
    primaryAction: primaryAction
      ? {
          ...primaryAction,
          label:
            primaryAction.label ||
            (primaryAction.external ? dictionary.betNow : dictionary.openAffiliateHub),
        }
      : null,
    secondaryActions,
    quickLinks,
    bookmakers,
    sponsorship: article?.sponsored
      ? {
          label: article.sponsorLabel || dictionary.newsSponsoredTag,
          name: article.sponsorName || null,
        }
      : null,
    entityType:
      entityContext.entityType ||
      (article?.id ? "article" : entityContext.competition ? "competition" : "news"),
    entityId: entityContext.entityId || article?.id || entityContext.competition?.id || null,
  };
}

async function readAffiliateLinks({ locale, geo }) {
  return safeDataRead(
    () =>
      db.affiliateLink.findMany({
        where: {
          isActive: true,
          AND: [
            {
              OR: [{ territory: null }, { territory: geo }, { territory: DEFAULT_MARKET_GEO }],
            },
            {
              OR: [{ surface: null }, { surface: NEWS_SURFACE_KEY }, { surface: "SHELL" }],
            },
            {
              OR: [{ locale: null }, { locale }, { locale: "en" }],
            },
          ],
        },
        include: {
          bookmaker: true,
        },
        orderBy: [{ isDefault: "desc" }, { priority: "asc" }, { createdAt: "asc" }],
        take: 32,
      }),
    []
  );
}

async function readFunnelEntries() {
  return safeDataRead(
    () =>
      db.funnelEntry.findMany({
        where: {
          isActive: true,
          surface: {
            in: [NEWS_SURFACE_KEY, "SHELL"],
          },
        },
        orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
        take: 8,
      }),
    []
  );
}

async function buildSharedNewsPromo({
  locale,
  viewerTerritory,
  article = null,
  entityContext = {},
  lead,
  title,
}) {
  const dictionary = getDictionary(locale);
  const geo = normalizeGeo(viewerTerritory, DEFAULT_MARKET_GEO);
  const [platform, affiliateLinks, funnelEntries] = await Promise.all([
    getPlatformPublicSnapshotData(),
    readAffiliateLinks({ locale, geo }),
    readFunnelEntries(),
  ]);

  return buildNewsPromoModel({
    locale,
    geo,
    dictionary,
    article,
    entityContext,
    platform,
    affiliateLinks,
    funnelEntries,
    lead,
    title,
  });
}

function hasOddsWidgetContent(odds, broadcastQuickActions) {
  return Boolean(
    odds?.insights?.bestBet ||
      odds?.insights?.topPicks?.length ||
      odds?.insights?.valueBets?.length ||
      odds?.insights?.bestOdds?.length ||
      odds?.insights?.highOddsMatches?.length ||
      odds?.ctaConfig?.primaryAffiliate?.href ||
      odds?.ctaConfig?.funnelActions?.length ||
      broadcastQuickActions?.primary ||
      broadcastQuickActions?.message
  );
}

async function buildArticleRelatedOdds(article, { locale, viewerTerritory }) {
  if (!article?.allowRelatedOdds || article?.ctaSafetyChecked === false) {
    return null;
  }

  const primaryFixture = article.primaryFixture || article.entities?.fixtures?.[0] || null;
  if (primaryFixture) {
    const fixture = await getFixtureDetail(primaryFixture.externalRef || primaryFixture.id, {
      locale,
      viewerTerritory,
    });

    if (fixture?.odds && hasOddsWidgetContent(fixture.odds, fixture.broadcast?.quickActions)) {
      return {
        title: article.primaryCompetition?.name || fixture.league?.name || null,
        lead: getDictionary(locale).matchInsightsLead,
        insights: fixture.odds.insights,
        ctaConfig: fixture.odds.ctaConfig,
        broadcastQuickActions: fixture.broadcast?.quickActions || null,
        showBestBet: true,
      };
    }
  }

  const primaryCompetition =
    article.primaryCompetition || article.entities?.competitions?.[0] || null;
  if (primaryCompetition?.code) {
    const league = await getLeagueDetail(primaryCompetition.code, {
      locale,
      viewerTerritory,
    });

    if (league?.competitionOdds && hasOddsWidgetContent(league.competitionOdds, null)) {
      return {
        title: league.name || primaryCompetition.name || null,
        lead: getDictionary(locale).competitionInsightsLead,
        insights: league.competitionOdds.insights,
        ctaConfig: league.competitionOdds.ctaConfig,
        broadcastQuickActions: null,
        showBestBet: false,
      };
    }
  }

  return null;
}

export async function getNewsHubExperience({
  locale = "en",
  viewerTerritory,
  hub,
} = {}) {
  return {
    promo: await buildSharedNewsPromo({
      locale,
      viewerTerritory,
      article: hub?.hero || hub?.items?.[0] || null,
      lead: getDictionary(locale).newsPromoModuleLead,
      title: getDictionary(locale).newsQuickRoutes,
    }),
  };
}

export async function getNewsModuleExperience({
  locale = "en",
  viewerTerritory,
  articles = [],
  entityContext = {},
} = {}) {
  return {
    promo: await buildSharedNewsPromo({
      locale,
      viewerTerritory,
      article: articles[0] || null,
      entityContext,
      lead: getDictionary(locale).newsPromoModuleLead,
      title: getDictionary(locale).newsQuickRoutes,
    }),
  };
}

export async function getNewsArticleExperience({
  locale = "en",
  viewerTerritory,
  article,
} = {}) {
  const [promo, relatedOdds] = await Promise.all([
    buildSharedNewsPromo({
      locale,
      viewerTerritory,
      article,
      lead: getDictionary(locale).newsJourneyLead,
      title: getDictionary(locale).newsJourneyTitle,
    }),
    buildArticleRelatedOdds(article, { locale, viewerTerritory }),
  ]);

  return {
    promo,
    relatedOdds,
  };
}
