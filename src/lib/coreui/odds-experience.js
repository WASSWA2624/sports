import { safeDataRead } from "../data-access";
import { db } from "../db";
import { getPlatformPublicSnapshotData } from "../platform/env";
import { getSportsSyncConfig } from "../sports/config";
import { formatDictionaryText, getDictionary } from "./dictionaries";
import {
  buildCompetitionOddsModule,
  buildFixtureBroadcastModule,
  buildFixtureOddsModule,
} from "./odds-broadcast";
import {
  buildBestOddsCards,
  buildHighOddsCards,
  buildPredictionCards,
} from "./live-board";
import { DEFAULT_MARKET_GEO, getGeoLabel, isGeoAllowed, normalizeGeo } from "./route-context";

function pickFirst(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return null;
}

function toNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (typeof value?.toNumber === "function") {
    const parsed = value.toNumber();
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (value != null) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function slugify(value, fallback = "bookmaker") {
  const normalized = String(value || fallback)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || fallback;
}

function normalizeSurfaceKey(value, fallback = "") {
  return String(value || fallback)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeTerritory(value, fallback = DEFAULT_MARKET_GEO) {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();

  if (!normalized) {
    return fallback;
  }

  if (["GLOBAL", "WORLD", "WORLDWIDE", "ALL", "INTERNATIONAL"].includes(normalized)) {
    return DEFAULT_MARKET_GEO;
  }

  return normalized;
}

function normalizeLocaleValue(value, fallback = "en") {
  const normalized = String(value || fallback).trim().toLowerCase();
  return normalized || fallback;
}

function matchesBookmakerName(link, bookmakerName) {
  if (!bookmakerName) {
    return false;
  }

  const target = String(bookmakerName).trim().toLowerCase();
  return [
    link?.bookmaker?.name,
    link?.bookmaker?.shortName,
    link?.bookmaker?.code,
    link?.code,
  ]
    .filter(Boolean)
    .some((value) => String(value).trim().toLowerCase() === target);
}

function rankAffiliateLink(
  link,
  targetTerritory,
  { surfaceKey, locale, bookmakerId, bookmakerName } = {}
) {
  let score = 0;
  const linkTerritory = normalizeTerritory(link?.territory, DEFAULT_MARKET_GEO);
  const linkSurface = normalizeSurfaceKey(link?.surface);
  const requestedSurface = normalizeSurfaceKey(surfaceKey);
  const linkLocale = normalizeLocaleValue(link?.locale, "en");
  const requestedLocale = normalizeLocaleValue(locale, "en");

  if (bookmakerId && link?.bookmakerId === bookmakerId) {
    score += 140;
  } else if (matchesBookmakerName(link, bookmakerName)) {
    score += 120;
  } else if (!bookmakerId && !bookmakerName) {
    score += 25;
  }

  if (linkTerritory === targetTerritory) {
    score += 100;
  } else if (linkTerritory === DEFAULT_MARKET_GEO || !link?.territory) {
    score += 35;
  }

  if (requestedSurface && linkSurface === requestedSurface) {
    score += 50;
  } else if (!linkSurface || linkSurface === "SHELL") {
    score += 12;
  }

  if (linkLocale === requestedLocale) {
    score += 20;
  } else if (linkLocale === "en" || !link?.locale) {
    score += 8;
  }

  if (link?.isDefault) {
    score += 8;
  }

  score += Math.max(0, 200 - Number(link?.priority || 100));
  return score;
}

function resolveAffiliateLink(
  links = [],
  targetTerritory,
  { surfaceKey, locale, bookmakerId, bookmakerName } = {}
) {
  const candidates = links
    .filter((link) => {
      const linkSurface = normalizeSurfaceKey(link?.surface);
      const requestedSurface = normalizeSurfaceKey(surfaceKey);

      if (requestedSurface && linkSurface && ![requestedSurface, "SHELL"].includes(linkSurface)) {
        return false;
      }

      const linkLocale = normalizeLocaleValue(link?.locale, "en");
      const requestedLocale = normalizeLocaleValue(locale, "en");
      if (link?.locale && ![requestedLocale, "en"].includes(linkLocale)) {
        return false;
      }

      if (bookmakerId) {
        return link?.bookmakerId === bookmakerId;
      }

      if (bookmakerName) {
        return matchesBookmakerName(link, bookmakerName);
      }

      return true;
    })
    .sort(
      (left, right) =>
        rankAffiliateLink(right, targetTerritory, {
          surfaceKey,
          locale,
          bookmakerId,
          bookmakerName,
        }) -
        rankAffiliateLink(left, targetTerritory, {
          surfaceKey,
          locale,
          bookmakerId,
          bookmakerName,
        })
    );

  return candidates[0] || null;
}

function buildAffiliateAction(link, context = {}) {
  if (!link) {
    return null;
  }

  return {
    href: link.destinationUrl || link.fallbackUrl || null,
    external: true,
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
    geo: context.geo || null,
    locale: context.locale || "en",
    surface: context.surface || null,
    slotKey: context.slotKey || null,
    fixtureId: context.fixtureId || null,
    competitionId: context.competitionId || null,
    targetEntityType: context.targetEntityType || null,
    targetEntityId: context.targetEntityId || null,
  };
}

function buildFallbackAffiliateAction(platform, locale, geo) {
  if (!platform?.affiliate?.partnerCodes?.length && !platform?.affiliate?.primaryPartner) {
    return null;
  }

  return {
    href: `/${locale}/affiliates`,
    external: false,
    affiliateLinkId: null,
    bookmakerId: null,
    bookmaker: null,
    partner: platform.affiliate.primaryPartner || platform.affiliate.partnerCodes[0] || null,
    geo,
    locale,
    surface: null,
    slotKey: null,
    fixtureId: null,
    competitionId: null,
    targetEntityType: null,
    targetEntityId: null,
  };
}

function buildCapabilitySummary() {
  const config = getSportsSyncConfig();
  const providerName =
    config.providerDescriptor?.name || config.providerDescriptor?.code || config.provider;

  return {
    providerCode: config.provider,
    providerName,
    oddsSupported: Boolean(config.supports?.odds && config.oddsEnabled),
    broadcastSupported: Boolean(config.supports?.broadcast && config.broadcastEnabled),
    predictionsSupported: Boolean(config.supports?.predictions && config.predictionsEnabled),
  };
}

function annotateSurfaceCapability(module, capability, { supported, message }) {
  return {
    ...module,
    state: supported ? module.state : "unavailable",
    message: supported ? module.message : message,
    capability: {
      providerCode: capability.providerCode,
      providerName: capability.providerName,
      supported,
      reason: supported ? null : "provider_unsupported",
    },
  };
}

function buildPredictionStateMessage(supported, dictionary, capability) {
  if (supported) {
    return null;
  }

  return formatDictionaryText(dictionary.predictionsProviderUnsupported, {
    provider: capability.providerName,
  });
}

function collectFixtureBookmakerIds(fixtures = []) {
  return [
    ...new Set(
      fixtures
        .flatMap((fixture) => fixture?.oddsMarkets || [])
        .map((market) => market?.bookmakerId)
        .filter(Boolean)
    ),
  ];
}

function buildBookmakerEntities({
  fixtures = [],
  bookmakerRecords = [],
  affiliateLinks = [],
  predictions = [],
  targetTerritory,
  surfaceKey,
  locale,
  geo,
}) {
  const entityMap = new Map();

  function register(key, payload = {}) {
    if (!key) {
      return null;
    }

    if (!entityMap.has(key)) {
      entityMap.set(key, {
        key,
        id: payload.id || null,
        code: payload.code || null,
        slug: payload.slug || slugify(payload.name || payload.code || key),
        name: payload.name || payload.shortName || payload.code || "Bookmaker",
        shortName: payload.shortName || null,
        websiteUrl: payload.websiteUrl || null,
        logoUrl: payload.logoUrl || null,
        marketCount: 0,
        predictionCount: 0,
        marketTypes: new Set(),
        affiliateLink: null,
      });
    }

    const existing = entityMap.get(key);
    existing.id = pickFirst(existing.id, payload.id);
    existing.code = pickFirst(existing.code, payload.code);
    existing.slug = pickFirst(existing.slug, payload.slug);
    existing.name = pickFirst(existing.name, payload.name, payload.shortName, payload.code);
    existing.shortName = pickFirst(existing.shortName, payload.shortName);
    existing.websiteUrl = pickFirst(existing.websiteUrl, payload.websiteUrl);
    existing.logoUrl = pickFirst(existing.logoUrl, payload.logoUrl);
    return existing;
  }

  for (const bookmaker of bookmakerRecords) {
    register(
      bookmaker.id ? `id:${bookmaker.id}` : `name:${slugify(bookmaker.name || bookmaker.shortName)}`,
      bookmaker
    );
  }

  for (const link of affiliateLinks) {
    const entity = register(
      link.bookmakerId
        ? `id:${link.bookmakerId}`
        : `name:${slugify(link.bookmaker?.name || link.bookmaker?.shortName || link.code)}`,
      {
        id: link.bookmakerId || link.bookmaker?.id || null,
        code: link.bookmaker?.code || link.code || null,
        slug: link.bookmaker?.slug || null,
        name: link.bookmaker?.name || link.bookmaker?.shortName || link.code,
        shortName: link.bookmaker?.shortName || null,
        websiteUrl: link.bookmaker?.websiteUrl || null,
        logoUrl: link.bookmaker?.logoUrl || null,
      }
    );

    const affiliateAction = buildAffiliateAction(link, {
      geo,
      locale,
      surface: surfaceKey,
    });
    if (entity && !entity.affiliateLink) {
      entity.affiliateLink = affiliateAction;
    }
  }

  for (const fixture of fixtures) {
    for (const market of fixture?.oddsMarkets || []) {
      const entity = register(
        market.bookmakerId
          ? `id:${market.bookmakerId}`
          : `name:${slugify(market.bookmaker)}`,
        {
          id: market.bookmakerId || null,
          name: market.bookmaker,
        }
      );

      if (!entity) {
        continue;
      }

      entity.marketCount += 1;
      if (market.marketType) {
        entity.marketTypes.add(market.marketType);
      }
    }
  }

  for (const prediction of predictions) {
    const entity = register(
      prediction.bookmaker?.id
        ? `id:${prediction.bookmaker.id}`
        : prediction.bookmakerId
          ? `id:${prediction.bookmakerId}`
          : `name:${slugify(prediction.bookmaker?.name || prediction.bookmaker?.shortName)}`,
      {
        id: prediction.bookmaker?.id || prediction.bookmakerId || null,
        code: prediction.bookmaker?.code || null,
        slug: prediction.bookmaker?.slug || null,
        name:
          prediction.bookmaker?.name ||
          prediction.bookmaker?.shortName ||
          prediction.bookmaker?.code ||
          null,
        shortName: prediction.bookmaker?.shortName || null,
        websiteUrl: prediction.bookmaker?.websiteUrl || null,
        logoUrl: prediction.bookmaker?.logoUrl || null,
      }
    );

    if (entity) {
      entity.predictionCount += 1;
    }
  }

  return [...entityMap.values()]
    .map((entry) => {
      const resolvedLink =
        entry.affiliateLink ||
        buildAffiliateAction(
          resolveAffiliateLink(affiliateLinks, targetTerritory, {
            surfaceKey,
            locale,
            bookmakerId: entry.id,
            bookmakerName: entry.name,
          }),
          {
            geo,
            locale,
            surface: surfaceKey,
          }
        );

      return {
        ...entry,
        marketTypes: [...entry.marketTypes].sort(),
        hasAffiliateLink: Boolean(resolvedLink?.href),
        affiliateLink: resolvedLink,
      };
    })
    .sort((left, right) => {
      if (Number(right.hasAffiliateLink) !== Number(left.hasAffiliateLink)) {
        return Number(right.hasAffiliateLink) - Number(left.hasAffiliateLink);
      }

      if (right.marketCount !== left.marketCount) {
        return right.marketCount - left.marketCount;
      }

      return left.name.localeCompare(right.name);
    });
}

function attachActionToOddsCard(card, affiliateLinks, context) {
  const affiliateLink = resolveAffiliateLink(affiliateLinks, context.targetTerritory, {
    surfaceKey: context.surfaceKey,
    locale: context.locale,
    bookmakerId: card.bookmakerId,
    bookmakerName: card.bookmaker,
  });

  return {
    ...card,
    cta: buildAffiliateAction(affiliateLink, {
      geo: context.geo,
      locale: context.locale,
      surface: context.surfaceKey,
      slotKey: context.slotKey,
      fixtureId: card.fixtureId || context.fixtureId || null,
      competitionId: context.competitionId || null,
      targetEntityType: "FIXTURE",
      targetEntityId: card.fixtureId || context.fixtureId || null,
    }),
  };
}

function attachActionToPredictionCard(card, affiliateLinks, context = {}) {
  const affiliateLink = resolveAffiliateLink(affiliateLinks, context.targetTerritory, {
    surfaceKey: context.surfaceKey,
    locale: context.locale,
    bookmakerId: card.bookmakerId,
    bookmakerName: card.bookmaker,
  });
  const targetEntityType = card.fixtureId ? "FIXTURE" : "COMPETITION";
  const targetEntityId = card.fixtureId || context.competitionId || null;

  return {
    ...card,
    reasoning: card.summary || null,
    cta: buildAffiliateAction(affiliateLink, {
      geo: context.geo,
      locale: context.locale,
      surface: context.surfaceKey,
      slotKey: context.slotKey,
      fixtureId: card.fixtureId || context.fixtureId || null,
      competitionId: context.competitionId || null,
      targetEntityType,
      targetEntityId,
    }),
  };
}

function attachActionsToFixtureGroups(groups, affiliateLinks, context) {
  return groups.map((group) => {
    const markets = group.markets.map((market) => {
      const affiliateLink = resolveAffiliateLink(affiliateLinks, context.targetTerritory, {
        surfaceKey: context.surfaceKey,
        locale: context.locale,
        bookmakerId: market.bookmakerId,
        bookmakerName: market.bookmaker,
      });

      return {
        ...market,
        cta: buildAffiliateAction(affiliateLink, {
          geo: context.geo,
          locale: context.locale,
          surface: context.surfaceKey,
          slotKey: `${context.baseSlotKey}:${market.id}`,
          fixtureId: context.fixtureId || null,
          competitionId: context.competitionId || null,
          targetEntityType: "FIXTURE",
          targetEntityId: context.fixtureId || null,
        }),
      };
    });

    const primaryMarket =
      [...markets].sort(
        (left, right) =>
          (toNumber(right.featuredSelection?.priceDecimal) || 0) -
          (toNumber(left.featuredSelection?.priceDecimal) || 0)
      )[0] || null;

    return {
      ...group,
      markets,
      primaryCta: primaryMarket?.cta || null,
    };
  });
}

function attachActionsToCompetitionTabs(tabs, affiliateLinks, context) {
  return tabs.map((tab) => ({
    ...tab,
    rows: tab.rows.map((row) => {
      const markets = row.markets.map((market) => {
        const affiliateLink = resolveAffiliateLink(affiliateLinks, context.targetTerritory, {
          surfaceKey: context.surfaceKey,
          locale: context.locale,
          bookmakerId: market.bookmakerId,
          bookmakerName: market.bookmaker,
        });

        return {
          ...market,
          cta: buildAffiliateAction(affiliateLink, {
            geo: context.geo,
            locale: context.locale,
            surface: context.surfaceKey,
            slotKey: `${context.baseSlotKey}:${row.fixtureId}:${market.id}`,
            fixtureId: row.fixtureId,
            competitionId: context.competitionId || null,
            targetEntityType: "FIXTURE",
            targetEntityId: row.fixtureId,
          }),
        };
      });

      const primaryMarket =
        [...markets].sort(
          (left, right) =>
            (toNumber(right.featuredSelection?.priceDecimal) || 0) -
            (toNumber(left.featuredSelection?.priceDecimal) || 0)
        )[0] || null;

      return {
        ...row,
        markets,
        primaryCta: primaryMarket?.cta || null,
      };
    }),
  }));
}

function buildBroadcastQuickActions(broadcast, context) {
  const primary =
    [...(broadcast.channels || [])]
      .filter((channel) => channel.url)
      .sort((left, right) => {
        if (left.channelType !== right.channelType) {
          return left.channelType === "streaming" ? -1 : 1;
        }

        return left.name.localeCompare(right.name);
      })[0] || null;

  if (!primary && !broadcast.message) {
    return null;
  }

  return {
    primary: primary
      ? {
          id: primary.id,
          name: primary.name,
          href: primary.url,
          territory: primary.territory,
          channelType: primary.channelType,
          channelTypeLabel: primary.channelTypeLabel,
          slotKey: `${context.baseSlotKey}:${primary.id}`,
          fixtureId: context.fixtureId || null,
        }
      : null,
    secondary: (broadcast.channels || [])
      .filter((channel) => channel.url && channel.id !== primary?.id)
      .slice(0, 2)
      .map((channel) => ({
        id: channel.id,
        name: channel.name,
        href: channel.url,
        territory: channel.territory,
        channelType: channel.channelType,
        channelTypeLabel: channel.channelTypeLabel,
        slotKey: `${context.baseSlotKey}:${channel.id}`,
        fixtureId: context.fixtureId || null,
      })),
    message: broadcast.message || null,
  };
}

function buildSurfaceInsights({
  predictions = [],
  predictionsEnabled = true,
  fixtures = [],
  affiliateLinks = [],
  targetTerritory,
  surfaceKey,
  locale,
  geo,
  fixtureId = null,
  competitionId = null,
  includeBestBet = false,
  predictionMessage = null,
}) {
  const predictionCards = predictionsEnabled ? buildPredictionCards(predictions, { locale }) : [];
  const topPicks = [...predictionCards]
    .sort((left, right) => (right.confidence || 0) - (left.confidence || 0))
    .slice(0, 3)
    .map((entry) =>
      attachActionToPredictionCard(entry, affiliateLinks, {
        targetTerritory,
        surfaceKey,
        locale,
        geo,
        fixtureId,
        competitionId,
        slotKey: `prediction:top-pick:${entry.key}`,
      })
    );
  const valueBets = [...predictionCards]
    .filter((entry) => entry.edgeScore != null)
    .sort((left, right) => (right.edgeScore || 0) - (left.edgeScore || 0))
    .slice(0, 3)
    .map((entry) =>
      attachActionToPredictionCard(entry, affiliateLinks, {
        targetTerritory,
        surfaceKey,
        locale,
        geo,
        fixtureId,
        competitionId,
        slotKey: `prediction:value-bet:${entry.key}`,
      })
    );
  const bestOdds = buildBestOddsCards(fixtures, { locale })
    .slice(0, 3)
    .map((entry) =>
      attachActionToOddsCard(entry, affiliateLinks, {
        targetTerritory,
        surfaceKey,
        locale,
        geo,
        fixtureId,
        competitionId,
        slotKey: `odds:best:${entry.key}`,
      })
    );
  const highOddsMatches = buildHighOddsCards(fixtures, { locale })
    .slice(0, 3)
    .map((entry) =>
      attachActionToOddsCard(entry, affiliateLinks, {
        targetTerritory,
        surfaceKey,
        locale,
        geo,
        fixtureId,
        competitionId,
        slotKey: `odds:high:${entry.key}`,
      })
    );
  const bestBet = includeBestBet
    ? topPicks.find((entry) => entry.fixtureId === fixtureId) ||
      topPicks[0] ||
      valueBets.find((entry) => entry.fixtureId === fixtureId) ||
      valueBets[0] ||
      null
    : null;

  return {
    predictionsEnabled,
    predictionMessage,
    topPicks,
    valueBets,
    bestOdds,
    highOddsMatches,
    bestBet,
  };
}

function buildFunnelActions(entries, platform, dictionary, geo) {
  const dbBacked = entries
    .filter((entry) => entry?.ctaUrl && isGeoAllowed(geo, entry.enabledGeos || []))
    .map((entry) => ({
      key: String(entry.channel || entry.key || entry.id).trim().toLowerCase(),
      label: entry.title || entry.channel || "Channel",
      description: entry.description || null,
      href: entry.ctaUrl,
      ctaLabel:
        entry.ctaLabel ||
        (String(entry.channel || "").trim().toLowerCase() === "telegram"
          ? dictionary.openTelegram
          : dictionary.openWhatsApp),
    }));

  if (dbBacked.length) {
    return dbBacked;
  }

  return (platform?.funnel?.actions || [])
    .filter((entry) => entry.url && isGeoAllowed(geo, entry.enabledGeos || []))
    .map((entry) => ({
      key: entry.key,
      label: entry.label,
      description: null,
      href: entry.url,
      ctaLabel:
        entry.key === "telegram" ? dictionary.openTelegram : dictionary.openWhatsApp,
    }));
}

function buildSurfaceCtaConfig({
  locale,
  geo,
  territory,
  platform,
  affiliateLinks,
  bookmakers,
  funnelEntries,
  dictionary,
  surfaceKey,
  fixtureId = null,
  competitionId = null,
  primaryAffiliateSeed = null,
}) {
  const primaryLink =
    primaryAffiliateSeed ||
    resolveAffiliateLink(affiliateLinks, territory, {
      surfaceKey,
      locale,
    });
  const primaryAffiliate =
    buildAffiliateAction(primaryLink, {
      geo,
      locale,
      surface: surfaceKey,
      slotKey: `${surfaceKey.toLowerCase()}:primary-affiliate`,
      fixtureId,
      competitionId,
      targetEntityType: fixtureId ? "FIXTURE" : competitionId ? "COMPETITION" : null,
      targetEntityId: fixtureId || competitionId || null,
    }) || buildFallbackAffiliateAction(platform, locale, geo);

  return {
    geo,
    geoLabel: getGeoLabel(geo),
    territory,
    territoryLabel: territory,
    bookmakers: bookmakers.map((entry) => entry.shortName || entry.name).slice(0, 6),
    primaryAffiliate,
    funnelActions: buildFunnelActions(funnelEntries, platform, dictionary, geo),
  };
}

async function readAffiliateLinks({ locale, geo, surfaceKey }) {
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
              OR: [{ surface: null }, { surface: surfaceKey }, { surface: "SHELL" }],
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
        take: 64,
      }),
    []
  );
}

async function readFunnelEntries(surfaceKey) {
  return safeDataRead(
    () =>
      db.funnelEntry.findMany({
        where: {
          isActive: true,
          surface: {
            in: [surfaceKey, "SHELL"],
          },
        },
        orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
        take: 12,
      }),
    []
  );
}

async function readBookmakerRecords(bookmakerIds = []) {
  if (!bookmakerIds.length) {
    return [];
  }

  return safeDataRead(
    () =>
      db.bookmaker.findMany({
        where: {
          id: {
            in: bookmakerIds,
          },
        },
      }),
    []
  );
}

async function readFixturePredictions(fixture, capability) {
  if (!capability.predictionsSupported) {
    return [];
  }

  return safeDataRead(
    () =>
      db.predictionRecommendation.findMany({
        where: {
          isPublished: true,
          AND: [
            {
              OR: [
                { fixtureId: fixture.id },
                fixture.competitionId ? { competitionId: fixture.competitionId } : null,
              ].filter(Boolean),
            },
            {
              OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
            },
          ],
        },
        include: {
          fixture: {
            include: {
              homeTeam: true,
              awayTeam: true,
              league: true,
            },
          },
          competition: true,
          bookmaker: true,
        },
        orderBy: [{ confidence: "desc" }, { edgeScore: "desc" }, { publishedAt: "desc" }],
        take: 16,
      }),
    []
  );
}

async function readCompetitionPredictions(league, capability) {
  if (!capability.predictionsSupported) {
    return [];
  }

  const fixtureIds = [...new Set((league.oddsFixtures || []).map((fixture) => fixture.id).filter(Boolean))];
  if (!league.competitionId && !fixtureIds.length) {
    return [];
  }

  return safeDataRead(
    () =>
      db.predictionRecommendation.findMany({
        where: {
          isPublished: true,
          AND: [
            {
              OR: [
                league.competitionId ? { competitionId: league.competitionId } : null,
                fixtureIds.length ? { fixtureId: { in: fixtureIds } } : null,
              ].filter(Boolean),
            },
            {
              OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
            },
          ],
        },
        include: {
          fixture: {
            include: {
              homeTeam: true,
              awayTeam: true,
              league: true,
            },
          },
          competition: true,
          bookmaker: true,
        },
        orderBy: [{ confidence: "desc" }, { edgeScore: "desc" }, { publishedAt: "desc" }],
        take: 18,
      }),
    []
  );
}

async function readRelatedOddsFixtures(fixture, capability) {
  if (!capability.oddsSupported || !fixture?.leagueId) {
    return [];
  }

  return safeDataRead(
    () =>
      db.fixture.findMany({
        where: {
          leagueId: fixture.leagueId,
          id: {
            not: fixture.id,
          },
          OR: [{ status: "LIVE" }, { startsAt: { gte: new Date() } }],
        },
        orderBy: [{ startsAt: "asc" }],
        take: 8,
        include: {
          league: true,
          homeTeam: true,
          awayTeam: true,
          oddsMarkets: {
            include: {
              selections: true,
            },
            orderBy: [{ bookmaker: "asc" }, { marketType: "asc" }],
            take: 8,
          },
        },
      }),
    []
  );
}

export async function buildFixtureBettingExperience(
  fixture,
  { locale = "en", viewerTerritory, flags } = {}
) {
  const dictionary = getDictionary(locale);
  const capability = buildCapabilitySummary();
  const territory = normalizeTerritory(viewerTerritory, DEFAULT_MARKET_GEO);
  const geo = normalizeGeo(viewerTerritory, DEFAULT_MARKET_GEO);
  const oddsEnabled = Boolean(flags?.fixtureOdds) && capability.oddsSupported;
  const broadcastEnabled = Boolean(flags?.fixtureBroadcast) && capability.broadcastSupported;
  const predictionsEnabled = Boolean(flags?.predictions) && capability.predictionsSupported;
  const baseOdds = buildFixtureOddsModule(fixture, {
    locale,
    viewerTerritory,
    enabled: oddsEnabled,
  });
  const baseBroadcast = buildFixtureBroadcastModule(fixture, {
    locale,
    viewerTerritory,
    enabled: broadcastEnabled,
  });
  const [platform, predictions, relatedFixtures, affiliateLinks, funnelEntries] =
    await Promise.all([
      getPlatformPublicSnapshotData(),
      predictionsEnabled ? readFixturePredictions(fixture, capability) : Promise.resolve([]),
      readRelatedOddsFixtures(fixture, capability),
      readAffiliateLinks({
        locale,
        geo: territory,
        surfaceKey: "MATCH",
      }),
      readFunnelEntries("MATCH"),
    ]);
  const bookmakerRecords = await readBookmakerRecords([
    ...new Set([
      ...collectFixtureBookmakerIds([fixture, ...relatedFixtures]),
      ...predictions.map((prediction) => prediction.bookmakerId).filter(Boolean),
    ]),
  ]);
  const bookmakers = buildBookmakerEntities({
    fixtures: [fixture, ...relatedFixtures],
    bookmakerRecords,
    affiliateLinks,
    predictions,
    targetTerritory: territory,
    surfaceKey: "MATCH",
    locale,
    geo,
  });
  const primaryPredictionLink =
    predictions.find((entry) => entry.fixtureId === fixture.id) || predictions[0] || null;
  const ctaConfig = buildSurfaceCtaConfig({
    locale,
    geo,
    territory,
    platform,
    affiliateLinks,
    bookmakers,
    funnelEntries,
    dictionary,
    surfaceKey: "MATCH",
    fixtureId: fixture.id,
    competitionId: fixture.competitionId || null,
    primaryAffiliateSeed: resolveAffiliateLink(affiliateLinks, territory, {
      surfaceKey: "MATCH",
      locale,
      bookmakerId:
        primaryPredictionLink?.bookmakerId || primaryPredictionLink?.bookmaker?.id || null,
      bookmakerName:
        primaryPredictionLink?.bookmaker?.shortName ||
        primaryPredictionLink?.bookmaker?.name ||
        null,
    }),
  });
  const insights = buildSurfaceInsights({
    predictions,
    fixtures: [fixture, ...relatedFixtures],
    affiliateLinks,
    targetTerritory: territory,
    surfaceKey: "MATCH",
    locale,
    geo,
    fixtureId: fixture.id,
    competitionId: fixture.competitionId || null,
    includeBestBet: true,
    predictionsEnabled,
    predictionMessage: predictionsEnabled
      ? buildPredictionStateMessage(capability.predictionsSupported, dictionary, capability)
      : null,
  });

  return {
    odds: {
      ...annotateSurfaceCapability(baseOdds, capability, {
        supported: capability.oddsSupported,
        message: formatDictionaryText(dictionary.oddsProviderUnsupported, {
          provider: capability.providerName,
        }),
      }),
      groups: attachActionsToFixtureGroups(baseOdds.groups, affiliateLinks, {
        targetTerritory: territory,
        surfaceKey: "MATCH",
        locale,
        geo,
        fixtureId: fixture.id,
        competitionId: fixture.competitionId || null,
        baseSlotKey: "match:odds-market",
      }),
      bookmakers,
      ctaConfig,
      insights,
    },
    broadcast: {
      ...annotateSurfaceCapability(baseBroadcast, capability, {
        supported: capability.broadcastSupported,
        message: formatDictionaryText(dictionary.broadcastProviderUnsupported, {
          provider: capability.providerName,
        }),
      }),
      quickActions: buildBroadcastQuickActions(baseBroadcast, {
        fixtureId: fixture.id,
        baseSlotKey: "match:broadcast",
      }),
    },
  };
}

export async function buildCompetitionBettingExperience(
  league,
  { locale = "en", viewerTerritory, flags } = {}
) {
  const dictionary = getDictionary(locale);
  const capability = buildCapabilitySummary();
  const territory = normalizeTerritory(viewerTerritory, DEFAULT_MARKET_GEO);
  const geo = normalizeGeo(viewerTerritory, DEFAULT_MARKET_GEO);
  const predictionsEnabled = Boolean(flags?.predictions) && capability.predictionsSupported;
  const fixtures = league.oddsFixtures || league.fixtures || [];
  const baseCompetitionOdds = buildCompetitionOddsModule(
    { ...league, fixtures },
    {
      locale,
      viewerTerritory,
      enabled: Boolean(flags?.competitionOdds) && capability.oddsSupported,
    }
  );
  const [platform, predictions, affiliateLinks, funnelEntries] = await Promise.all([
    getPlatformPublicSnapshotData(),
    predictionsEnabled ? readCompetitionPredictions(league, capability) : Promise.resolve([]),
    readAffiliateLinks({
      locale,
      geo: territory,
      surfaceKey: "COMPETITION",
    }),
    readFunnelEntries("COMPETITION"),
  ]);
  const bookmakerRecords = await readBookmakerRecords([
    ...new Set([
      ...collectFixtureBookmakerIds(fixtures),
      ...predictions.map((prediction) => prediction.bookmakerId).filter(Boolean),
    ]),
  ]);
  const bookmakers = buildBookmakerEntities({
    fixtures,
    bookmakerRecords,
    affiliateLinks,
    predictions,
    targetTerritory: territory,
    surfaceKey: "COMPETITION",
    locale,
    geo,
  });
  const ctaConfig = buildSurfaceCtaConfig({
    locale,
    geo,
    territory,
    platform,
    affiliateLinks,
    bookmakers,
    funnelEntries,
    dictionary,
    surfaceKey: "COMPETITION",
    competitionId: league.competitionId || null,
  });
  const insights = buildSurfaceInsights({
    predictions,
    fixtures,
    affiliateLinks,
    targetTerritory: territory,
    surfaceKey: "COMPETITION",
    locale,
    geo,
    competitionId: league.competitionId || null,
    includeBestBet: false,
    predictionsEnabled,
    predictionMessage: predictionsEnabled
      ? buildPredictionStateMessage(capability.predictionsSupported, dictionary, capability)
      : null,
  });

  return {
    ...annotateSurfaceCapability(baseCompetitionOdds, capability, {
      supported: capability.oddsSupported,
      message: formatDictionaryText(dictionary.oddsProviderUnsupported, {
        provider: capability.providerName,
      }),
    }),
    tabs: attachActionsToCompetitionTabs(baseCompetitionOdds.tabs, affiliateLinks, {
      targetTerritory: territory,
      surfaceKey: "COMPETITION",
      locale,
      geo,
      competitionId: league.competitionId || null,
      baseSlotKey: "competition:odds-market",
    }),
    bookmakers,
    ctaConfig,
    insights,
  };
}
