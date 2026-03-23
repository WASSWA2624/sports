import { formatDictionaryText, getDictionary } from "./dictionaries";

const DEFAULT_VIEWER_TERRITORY = String(
  process.env.SPORTS_DEFAULT_TERRITORY || "US"
).toUpperCase();
const ODDS_STALE_MS = 25 * 60 * 1000;
const BROADCAST_STALE_MS = 12 * 60 * 60 * 1000;
const GLOBAL_TERRITORY_MARKERS = new Set(["GLOBAL", "WORLD", "WORLDWIDE", "ALL"]);

function asArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (Array.isArray(value?.data)) {
    return value.data;
  }

  return [];
}

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

function parseDate(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toIsoString(value) {
  const parsed = parseDate(value);
  return parsed ? parsed.toISOString() : null;
}

function slugify(value, fallback = "group") {
  const normalized = String(value || fallback)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || fallback;
}

function normalizeTerritoryToken(value) {
  if (!value) {
    return null;
  }

  return String(value)
    .trim()
    .replace(/[^a-z0-9]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
}

function extractTerritoryEntries(value) {
  if (!value) {
    return [];
  }

  if (typeof value === "string") {
    return value
      .split(/[;,|]/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry) => extractTerritoryEntries(entry));
  }

  if (typeof value === "object") {
    const nested = pickFirst(
      value.iso2,
      value.iso_2,
      value.iso3,
      value.iso_3,
      value.code,
      value.name,
      value.country_name,
      value.country,
      value.label
    );
    return nested ? [nested] : [];
  }

  return [String(value)];
}

function buildTerritoryInfo(...sources) {
  const labels = [];
  const tokens = new Set();

  for (const source of sources) {
    for (const entry of extractTerritoryEntries(source)) {
      const normalized = normalizeTerritoryToken(entry);
      if (!normalized) {
        continue;
      }

      if (!labels.includes(String(entry))) {
        labels.push(String(entry));
      }
      tokens.add(normalized);
    }
  }

  return {
    labels,
    tokens: [...tokens],
  };
}

function matchesViewerTerritory(territoryInfo, viewerTerritory) {
  if (!territoryInfo.tokens.length) {
    return true;
  }

  if (territoryInfo.tokens.some((token) => GLOBAL_TERRITORY_MARKERS.has(token))) {
    return true;
  }

  return territoryInfo.tokens.includes(viewerTerritory);
}

function getRestrictionPolicy(metadata) {
  if (!metadata || typeof metadata !== "object") {
    return {
      restricted: false,
      allowed: buildTerritoryInfo(),
      blocked: buildTerritoryInfo(),
    };
  }

  return {
    restricted: Boolean(
      pickFirst(
        metadata.regionRestricted,
        metadata.region_restricted,
        metadata.restricted,
        false
      )
    ),
    allowed: buildTerritoryInfo(
      metadata.allowedTerritories,
      metadata.allowed_territories,
      metadata.availableTerritories,
      metadata.available_territories,
      metadata.availableIn,
      metadata.countries
    ),
    blocked: buildTerritoryInfo(
      metadata.blockedTerritories,
      metadata.blocked_territories,
      metadata.restrictedTerritories,
      metadata.restricted_territories
    ),
  };
}

function isRestrictedForViewer(metadata, viewerTerritory) {
  const policy = getRestrictionPolicy(metadata);

  if (policy.blocked.tokens.includes(viewerTerritory)) {
    return true;
  }

  if (policy.allowed.tokens.length && !matchesViewerTerritory(policy.allowed, viewerTerritory)) {
    return true;
  }

  return policy.restricted && !policy.allowed.tokens.includes(viewerTerritory);
}

function collectTerritoriesFromPolicy(metadata) {
  const policy = getRestrictionPolicy(metadata);
  return [...new Set([...policy.allowed.labels, ...policy.blocked.labels])];
}

function isStaleTimestamp(value, thresholdMs) {
  const parsed = parseDate(value);
  if (!parsed) {
    return false;
  }

  return Date.now() - parsed.getTime() > thresholdMs;
}

function formatPrice(value, locale) {
  const parsed = toNumber(value);
  if (parsed == null) {
    return null;
  }

  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(parsed);
}

function formatLine(value) {
  const parsed = toNumber(value);
  if (parsed == null) {
    return null;
  }

  return Number.isInteger(parsed) ? String(parsed) : parsed.toFixed(1);
}

function sortSelections(left, right) {
  const leftActiveRank = left.isActive ? 0 : 1;
  const rightActiveRank = right.isActive ? 0 : 1;
  if (leftActiveRank !== rightActiveRank) {
    return leftActiveRank - rightActiveRank;
  }

  return left.label.localeCompare(right.label);
}

function normalizeOddsSelection(selection, locale) {
  const line = formatLine(selection.line);

  return {
    id: String(pickFirst(selection.id, selection.externalRef, selection.label)),
    label: String(selection.label || "Selection"),
    line,
    lineLabel: line ? `Line ${line}` : null,
    priceDecimal: toNumber(selection.priceDecimal),
    priceLabel: formatPrice(selection.priceDecimal, locale),
    isActive: Boolean(selection.isActive),
  };
}

function normalizeOddsMarket(market, locale) {
  const selections = asArray(market.selections)
    .map((selection) => normalizeOddsSelection(selection, locale))
    .filter((selection) => selection.priceDecimal != null)
    .sort(sortSelections);

  return {
    id: String(pickFirst(market.id, market.externalRef, `${market.bookmaker}-${market.marketType}`)),
    bookmaker: market.bookmaker,
    marketType: market.marketType,
    suspended: Boolean(market.suspended),
    selections,
    lastUpdatedAt: toIsoString(pickFirst(market.lastSyncedAt, market.updatedAt)),
  };
}

function sortMarketGroups(left, right) {
  const leftRank = left.rowCount * -1;
  const rightRank = right.rowCount * -1;
  if (leftRank !== rightRank) {
    return leftRank - rightRank;
  }

  return left.label.localeCompare(right.label);
}

function summarizeState(stateCounts) {
  if (stateCounts.available > 0) {
    return "available";
  }

  if (stateCounts.stale > 0) {
    return "stale";
  }

  if (stateCounts.region_restricted > 0 && stateCounts.unavailable === 0) {
    return "region_restricted";
  }

  return "unavailable";
}

function getStateLabel(state, dictionary) {
  const labels = {
    available: dictionary.coverageReady,
    stale: dictionary.coverageStale,
    unavailable: dictionary.coverageUnavailable,
    region_restricted: dictionary.coverageRestricted,
  };

  return labels[state] || dictionary.coverageUnavailable;
}

function getStateMessage(surface, state, dictionary, viewerTerritory, territories = []) {
  if (surface === "broadcast") {
    if (state === "stale") {
      return dictionary.broadcastStale;
    }

    if (state === "region_restricted") {
      return territories.length
        ? formatDictionaryText(dictionary.broadcastRegionRestrictedDetail, {
            territory: viewerTerritory,
            territories: territories.join(", "),
          })
        : dictionary.broadcastRegionRestricted;
    }

    if (state === "unavailable") {
      return dictionary.broadcastUnavailable;
    }

    return null;
  }

  if (state === "stale") {
    return dictionary.oddsStale;
  }

  if (state === "region_restricted") {
    return territories.length
      ? formatDictionaryText(dictionary.oddsRegionRestrictedDetail, {
          territory: viewerTerritory,
          territories: territories.join(", "),
        })
      : formatDictionaryText(dictionary.oddsRegionRestricted, {
          territory: viewerTerritory,
        });
  }

  if (state === "unavailable") {
    return dictionary.oddsUnavailable;
  }

  return null;
}

function buildOddsLegalCopy(locale) {
  const dictionary = getDictionary(locale);

  return {
    minimumAge: 18,
    gateTitle: dictionary.oddsAgeGateTitle,
    gateBody: dictionary.oddsAgeGateBody,
    gateConfirmLabel: dictionary.oddsAgeGateConfirm,
    legalLines: [
      dictionary.oddsForInfoOnly,
      dictionary.oddsLegalAge,
      dictionary.oddsLegalJurisdiction,
      dictionary.oddsLegalSupport,
    ],
  };
}

function buildOddsState(markets, fixture, viewerTerritory) {
  if (markets.length) {
    const latestSyncAt = markets
      .map((market) => pickFirst(market.lastUpdatedAt, market.lastSyncedAt, market.updatedAt))
      .filter(Boolean)
      .sort()
      .at(-1);

    return {
      state: isStaleTimestamp(latestSyncAt, ODDS_STALE_MS) ? "stale" : "available",
      latestSyncAt: toIsoString(latestSyncAt),
    };
  }

  const territories = collectTerritoriesFromPolicy(
    pickFirst(fixture?.metadata?.oddsAvailability, fixture?.metadata?.odds)
  );
  const state = isRestrictedForViewer(
    pickFirst(fixture?.metadata?.oddsAvailability, fixture?.metadata?.odds),
    viewerTerritory
  )
    ? "region_restricted"
    : "unavailable";

  return {
    state,
    latestSyncAt: null,
    territories,
  };
}

export function resolveViewerTerritory({ territory, headers } = {}) {
  const explicit = normalizeTerritoryToken(territory);
  if (explicit) {
    return explicit;
  }

  const headerKeys = [
    "x-vercel-ip-country",
    "cf-ipcountry",
    "x-country-code",
    "x-geo-country",
  ];

  for (const key of headerKeys) {
    const value = headers?.get?.(key) ?? headers?.[key];
    const normalized = normalizeTerritoryToken(value);
    if (normalized) {
      return normalized;
    }
  }

  return DEFAULT_VIEWER_TERRITORY;
}

export function buildFixtureOddsModule(
  fixture,
  { locale = "en", viewerTerritory = DEFAULT_VIEWER_TERRITORY, enabled = true } = {}
) {
  const dictionary = getDictionary(locale);
  const legal = buildOddsLegalCopy(locale);

  if (!enabled) {
    return {
      enabled: false,
      state: "unavailable",
      stateLabel: getStateLabel("unavailable", dictionary),
      message: dictionary.oddsUnavailable,
      viewerTerritory,
      lastUpdatedAt: null,
      sourceLabels: [],
      groups: [],
      summary: {
        marketCount: 0,
        bookmakerCount: 0,
        activeSelectionCount: 0,
      },
      legal,
    };
  }

  const allMarkets = asArray(fixture?.oddsMarkets);
  const accessibleMarkets = allMarkets.filter(
    (market) => !isRestrictedForViewer(market.metadata, viewerTerritory)
  );
  const restrictedTerritories = [
    ...new Set(
      allMarkets
        .filter((market) => isRestrictedForViewer(market.metadata, viewerTerritory))
        .flatMap((market) => collectTerritoriesFromPolicy(market.metadata))
    ),
  ];
  const normalizedMarkets = accessibleMarkets
    .map((market) => normalizeOddsMarket(market, locale))
    .filter((market) => market.selections.length);

  const grouped = [...normalizedMarkets.reduce((accumulator, market) => {
    const key = slugify(market.marketType, "market");

    if (!accumulator.has(key)) {
      accumulator.set(key, {
        id: key,
        label: market.marketType,
        sources: [],
        markets: [],
      });
    }

    const group = accumulator.get(key);
    if (!group.sources.includes(market.bookmaker)) {
      group.sources.push(market.bookmaker);
    }
    group.markets.push(market);
    return accumulator;
  }, new Map()).values()]
    .map((group) => ({
      ...group,
      rowCount: group.markets.length,
    }))
    .sort(sortMarketGroups);

  const status = buildOddsState(normalizedMarkets, fixture, viewerTerritory);
  const territories =
    status.territories ||
    restrictedTerritories ||
    collectTerritoriesFromPolicy(pickFirst(fixture?.metadata?.oddsAvailability, fixture?.metadata?.odds));

  return {
    enabled: true,
    state:
      normalizedMarkets.length === 0 && allMarkets.length > 0 && accessibleMarkets.length === 0
        ? "region_restricted"
        : status.state,
    stateLabel: getStateLabel(
      normalizedMarkets.length === 0 && allMarkets.length > 0 && accessibleMarkets.length === 0
        ? "region_restricted"
        : status.state,
      dictionary
    ),
    message: getStateMessage(
      "odds",
      normalizedMarkets.length === 0 && allMarkets.length > 0 && accessibleMarkets.length === 0
        ? "region_restricted"
        : status.state,
      dictionary,
      viewerTerritory,
      territories
    ),
    viewerTerritory,
    lastUpdatedAt: status.latestSyncAt,
    territories,
    sourceLabels: [...new Set(normalizedMarkets.map((market) => market.bookmaker))],
    groups: grouped,
    summary: {
      marketCount: normalizedMarkets.length,
      bookmakerCount: [...new Set(normalizedMarkets.map((market) => market.bookmaker))].length,
      activeSelectionCount: normalizedMarkets.reduce(
        (count, market) => count + market.selections.filter((selection) => selection.isActive).length,
        0
      ),
    },
    legal,
  };
}

export function buildCompetitionOddsModule(
  league,
  { locale = "en", viewerTerritory = DEFAULT_VIEWER_TERRITORY, enabled = true } = {}
) {
  const dictionary = getDictionary(locale);
  const fixtureModules = asArray(league?.fixtures).map((fixture) => ({
    fixtureId: String(fixture.id),
    fixtureRef: String(pickFirst(fixture.externalRef, fixture.id)),
    fixtureLabel: `${fixture.homeTeam?.name || dictionary.home} vs ${fixture.awayTeam?.name || dictionary.away}`,
    startsAt: toIsoString(fixture.startsAt),
    teams: {
      home: fixture.homeTeam?.name || dictionary.homeSide,
      away: fixture.awayTeam?.name || dictionary.awaySide,
    },
    odds: buildFixtureOddsModule(fixture, {
      locale,
      viewerTerritory,
      enabled,
    }),
  }));

  const tabs = [...fixtureModules.reduce((accumulator, fixtureModule) => {
    for (const group of fixtureModule.odds.groups) {
      if (!accumulator.has(group.id)) {
        accumulator.set(group.id, {
          id: group.id,
          label: group.label,
          rows: [],
        });
      }

      accumulator.get(group.id).rows.push({
        fixtureId: fixtureModule.fixtureId,
        fixtureRef: fixtureModule.fixtureRef,
        fixtureLabel: fixtureModule.fixtureLabel,
        startsAt: fixtureModule.startsAt,
        teams: fixtureModule.teams,
        state: fixtureModule.odds.state,
        stateLabel: fixtureModule.odds.stateLabel,
        sources: group.sources,
        markets: group.markets,
      });
    }

    return accumulator;
  }, new Map()).values()]
    .map((tab) => ({
      ...tab,
      rowCount: tab.rows.length,
    }))
    .sort(sortMarketGroups);

  const stateCounts = fixtureModules.reduce(
    (counts, fixtureModule) => {
      counts[fixtureModule.odds.state] = (counts[fixtureModule.odds.state] || 0) + 1;
      return counts;
    },
    { available: 0, stale: 0, unavailable: 0, region_restricted: 0 }
  );

  const state = summarizeState(stateCounts);
  const territories = [
    ...new Set(
      fixtureModules.flatMap((fixtureModule) =>
        fixtureModule.odds.state === "region_restricted" ? fixtureModule.odds.territories || [] : []
      )
    ),
  ];

  return {
    enabled,
    state,
    stateLabel: getStateLabel(state, dictionary),
    message: getStateMessage("odds", state, dictionary, viewerTerritory, territories),
    viewerTerritory,
    tabs,
    fixtures: fixtureModules,
    legal: buildOddsLegalCopy(locale),
    summary: {
      fixtureCount: fixtureModules.filter((fixtureModule) => fixtureModule.odds.groups.length).length,
      bookmakerCount: [
        ...new Set(
          fixtureModules.flatMap((fixtureModule) => fixtureModule.odds.sourceLabels)
        ),
      ].length,
      stateCounts,
    },
  };
}

function classifyChannelType(channel) {
  const normalized = String(pickFirst(channel.channelType, channel.type) || "")
    .trim()
    .toLowerCase();

  if (
    normalized.includes("stream") ||
    normalized.includes("ott") ||
    normalized.includes("online")
  ) {
    return "streaming";
  }

  if (normalized.includes("tv") || normalized.includes("channel")) {
    return "tv";
  }

  return channel.url ? "streaming" : "tv";
}

export function buildFixtureBroadcastModule(
  fixture,
  { locale = "en", viewerTerritory = DEFAULT_VIEWER_TERRITORY, enabled = true } = {}
) {
  const dictionary = getDictionary(locale);

  if (!enabled) {
    return {
      enabled: false,
      state: "unavailable",
      stateLabel: getStateLabel("unavailable", dictionary),
      message: dictionary.broadcastUnavailable,
      viewerTerritory,
      lastUpdatedAt: null,
      channels: [],
      restrictedTerritories: [],
      summary: {
        channelCount: 0,
        streamingCount: 0,
        televisionCount: 0,
      },
    };
  }

  const normalizedChannels = asArray(fixture?.broadcastChannels)
    .map((channel) => {
      const territoryInfo = buildTerritoryInfo(
        channel.territory,
        channel.metadata?.territories,
        channel.metadata?.countries
      );
      const type = classifyChannelType(channel);

      return {
        id: String(
          pickFirst(channel.id, channel.name, `${channel.name}-${territoryInfo.labels.join("-")}`)
        ),
        name: channel.name,
        territory: territoryInfo.labels[0] || null,
        territories: territoryInfo.labels,
        channelType: type,
        channelTypeLabel:
          type === "streaming" ? dictionary.broadcastStreaming : dictionary.broadcastTelevision,
        url: channel.url || null,
        isActive: channel.isActive !== false,
        availableToViewer: matchesViewerTerritory(territoryInfo, viewerTerritory),
      };
    })
    .filter((channel) => channel.isActive);

  const visibleChannels = normalizedChannels.filter((channel) => channel.availableToViewer);
  const restrictedTerritories = [
    ...new Set(
      normalizedChannels
        .filter((channel) => !channel.availableToViewer)
        .flatMap((channel) => channel.territories)
    ),
  ];
  const lastUpdatedAt = toIsoString(
    pickFirst(
      fixture?.lastSyncedAt,
      ...normalizedChannels.map((channel) => channel.updatedAt)
    )
  );

  const state = visibleChannels.length
    ? isStaleTimestamp(lastUpdatedAt, BROADCAST_STALE_MS)
      ? "stale"
      : "available"
    : normalizedChannels.length
      ? "region_restricted"
      : "unavailable";

  return {
    enabled: true,
    state,
    stateLabel: getStateLabel(state, dictionary),
    message: getStateMessage("broadcast", state, dictionary, viewerTerritory, restrictedTerritories),
    viewerTerritory,
    lastUpdatedAt,
    channels: visibleChannels,
    restrictedTerritories,
    summary: {
      channelCount: visibleChannels.length,
      streamingCount: visibleChannels.filter((channel) => channel.channelType === "streaming").length,
      televisionCount: visibleChannels.filter((channel) => channel.channelType === "tv").length,
    },
  };
}
