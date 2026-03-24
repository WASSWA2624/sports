import { z } from "zod";
import {
  COREUI_CACHE_TAGS,
  FEATURE_CACHE_TAGS,
  KNOWN_CACHE_TAGS,
  NEWS_CACHE_TAGS,
  revalidateTagsWithAudit,
} from "./cache";
import { getAssetDeliverySnapshot } from "./assets-server";
import { db } from "./db";
import { safeDataRead } from "./data-access";
import { logAuditEvent } from "./audit";
import { getOperationalDashboardSnapshot } from "./operations";
import { getSportsSyncConfig } from "./sports/config";
import { getProviderChain, getRegisteredSportsProviders } from "./sports/provider";
import { getUserLoginIdentifier } from "./auth-identifiers";

const ROLE_NAMES = ["USER", "EDITOR", "ADMIN"];
const ISSUE_TYPES = [
  "DATA_DISPUTE",
  "WRONG_SCORE",
  "BROKEN_ARTICLE_CONTENT",
  "BROKEN_AFFILIATE_DESTINATION",
  "PROVIDER_SWITCH_INCIDENT",
  "COMPLIANCE_INCIDENT",
];
const ISSUE_STATUSES = ["OPEN", "INVESTIGATING", "RESOLVED", "DISMISSED"];
const ISSUE_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const REVIEW_STATES = ["PENDING", "APPROVED", "HOLD"];

const STRING_MAX = 191;
const URL_OR_EMPTY_SCHEMA = z.union([z.string().url(), z.literal(""), z.null()]).optional();
const DATE_OR_EMPTY_SCHEMA = z.union([z.string().datetime(), z.literal(""), z.null()]).optional();
const GEO_LIST_SCHEMA = z.array(z.string().min(2).max(16)).max(32).optional().nullable();
const COMMERCIAL_CACHE_TAGS = [
  ...new Set([...COREUI_CACHE_TAGS, ...NEWS_CACHE_TAGS, ...FEATURE_CACHE_TAGS]),
];
const CACHE_TAG_DEPENDENCIES = [
  { tag: "coreui:home", label: "Home board", source: "sync" },
  { tag: "coreui:live", label: "Live board", source: "sync" },
  { tag: "coreui:fixtures", label: "Fixtures page", source: "sync" },
  { tag: "coreui:results", label: "Results page", source: "sync" },
  { tag: "coreui:tables", label: "Tables page", source: "sync" },
  { tag: "coreui:leagues", label: "Leagues directory", source: "sync" },
  { tag: "coreui:teams", label: "Teams directory", source: "sync" },
  { tag: "coreui:shell", label: "Public shell", source: "shell" },
  { tag: "news:hub", label: "News hub", source: "news" },
  { tag: "news:articles", label: "News articles", source: "news" },
  { tag: "news:homepage", label: "Homepage news module", source: "news" },
  { tag: "news:latest", label: "Latest news strips", source: "news" },
  { tag: "feature-flags", label: "Feature controls", source: "flags" },
];

export const PUBLIC_MODULE_DEFAULTS = {
  news_hub: true,
  homepage_news_module: true,
  league_news_module: true,
  team_news_module: true,
  live_news_strip: true,
  results_news_strip: true,
  fixture_odds: true,
  competition_odds: true,
  fixture_broadcast: true,
  shell_right_rail_ad_slot: true,
  shell_right_rail_consent: true,
  shell_right_rail_support: true,
  shell_right_rail_funnel_entry: true,
};

export const EMPTY_CONTROL_PLANE_WORKSPACE = {
  roles: [],
  users: [],
  providers: [],
  providerRegistry: [],
  providerChain: [],
  providerSelection: {
    code: null,
    name: null,
    adapterFamily: null,
    implemented: false,
    envNamespace: null,
    supportedSports: [],
    capabilities: [],
    fallbackProviders: [],
  },
  featureFlags: [],
  shellModules: [],
  adSlots: [],
  consentTexts: [],
  commercial: {
    bookmakers: [],
    affiliateLinks: [],
    funnelEntries: [],
    predictionRecommendations: [],
    monetizationPlacements: [],
    topSurfaces: [],
    summary: {
      activeBookmakers: 0,
      activeAffiliateLinks: 0,
      activeFunnelEntries: 0,
      livePlacements: 0,
      publishedPredictions: 0,
      clicksLast24Hours: 0,
      conversionsLast24Hours: 0,
      qualifiedConversionsLast24Hours: 0,
      conversionRate: null,
      activeAdSlots: 0,
      adSlotsWithoutPlacements: 0,
      placementAttentionCount: 0,
    },
  },
  sync: {
    recentJobs: [],
    checkpoints: [],
    summary: {
      failedJobsLast24Hours: 0,
      checkpointStates: {},
    },
  },
  issues: {
    items: [],
    summary: {
      total: 0,
      byStatus: {},
      openByType: {},
    },
  },
  ops: {
    staleData: {
      liveFixtures: 0,
      oddsMarkets: 0,
      broadcastChannels: 0,
    },
    cacheHealth: [],
    routeErrors: {
      events: [],
      summary: {
        lastHourCount: 0,
        last24HoursCount: 0,
        topRoutes: [],
      },
    },
    observability: {
      latency: {
        topRoutes: [],
      },
      cache: {
        byTag: [],
        hitRate: null,
      },
      search: {},
      pressure: {
        latest: null,
      },
      drills: {
        recent: [],
        statusCounts: {},
      },
      providers: [],
      liveData: {},
      slos: [],
      summary: {
        routeErrorsLastHour: 0,
        knownCacheTags: KNOWN_CACHE_TAGS.length,
        cacheTagsObserved: 0,
        activeProviders: 0,
        drillRunsLast24Hours: 0,
      },
      inMemoryCache: [],
    },
  },
  assets: {
    strategy: [],
    coverage: {
      competitions: {
        covered: 0,
        missing: 0,
        coverageRate: null,
      },
      teams: {
        covered: 0,
        missing: 0,
        coverageRate: null,
      },
      articles: {
        covered: 0,
        missing: 0,
        coverageRate: null,
      },
    },
  },
  auditTrail: [],
  summary: {
    adminUsers: 0,
    activeProviders: 0,
    openIssues: 0,
    cacheAttentionCount: 0,
    drillRunsLast24Hours: 0,
    routeErrorsLastHour: 0,
    commercialAttentionCount: 0,
  },
  degraded: true,
};

const jsonSchema = z.record(z.string(), z.any()).nullable().optional();

const userUpdateSchema = z.object({
  isActive: z.boolean().optional(),
  roles: z.array(z.enum(ROLE_NAMES)).min(1).max(ROLE_NAMES.length).optional(),
});

const providerUpdateSchema = z.object({
  isActive: z.boolean().optional(),
  name: z.string().min(2).max(STRING_MAX).optional(),
  kind: z.string().min(2).max(STRING_MAX).optional().nullable(),
  note: z.string().max(1000).optional().nullable(),
  metadata: jsonSchema,
});

const featureFlagUpdateSchema = z.object({
  enabled: z.boolean(),
  description: z.string().max(500).optional().nullable(),
});

const shellModuleUpdateSchema = z.object({
  name: z.string().min(2).max(STRING_MAX).optional(),
  location: z.string().min(2).max(STRING_MAX).optional(),
  description: z.string().max(500).optional().nullable(),
  isEnabled: z.boolean().optional(),
  emergencyDisabled: z.boolean().optional(),
  emergencyReason: z.string().max(1000).optional().nullable(),
  metadata: jsonSchema,
});

const adSlotUpdateSchema = z.object({
  name: z.string().min(2).max(STRING_MAX),
  placement: z.string().min(2).max(STRING_MAX),
  size: z.string().max(STRING_MAX).optional().nullable(),
  copy: z.string().max(2000).optional().nullable(),
  ctaLabel: z.string().max(80).optional().nullable(),
  ctaUrl: z.union([z.string().url(), z.literal(""), z.null()]).optional(),
  isEnabled: z.boolean(),
  metadata: jsonSchema,
});

const consentTextUpdateSchema = z.object({
  locale: z.string().min(2).max(16),
  title: z.string().min(2).max(STRING_MAX),
  body: z.string().min(12).max(4000),
  version: z.number().int().min(1).max(999).optional(),
  isActive: z.boolean(),
  metadata: jsonSchema,
});

const bookmakerUpdateSchema = z.object({
  name: z.string().min(2).max(STRING_MAX).optional(),
  shortName: z.string().max(80).optional().nullable(),
  websiteUrl: URL_OR_EMPTY_SCHEMA,
  affiliateBaseUrl: URL_OR_EMPTY_SCHEMA,
  isActive: z.boolean().optional(),
  metadata: jsonSchema,
});

const affiliateLinkUpdateSchema = z.object({
  territory: z.string().max(16).optional().nullable(),
  locale: z.string().max(16).optional().nullable(),
  surface: z.string().max(32).optional().nullable(),
  linkType: z.string().max(40).optional().nullable(),
  destinationUrl: z.string().url().optional(),
  trackingTemplate: z.string().max(4000).optional().nullable(),
  fallbackUrl: URL_OR_EMPTY_SCHEMA,
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
  priority: z.number().int().min(0).max(9999).optional(),
  metadata: jsonSchema,
});

const funnelEntryUpdateSchema = z.object({
  channel: z.string().min(2).max(STRING_MAX).optional(),
  surface: z.string().min(2).max(STRING_MAX).optional(),
  title: z.string().min(2).max(STRING_MAX).optional(),
  description: z.string().max(2000).optional().nullable(),
  ctaLabel: z.string().min(2).max(80).optional(),
  ctaUrl: z.string().url().optional(),
  territory: z.string().max(16).optional().nullable(),
  enabledGeos: GEO_LIST_SCHEMA,
  isActive: z.boolean().optional(),
  priority: z.number().int().min(0).max(9999).optional(),
  metadata: jsonSchema,
});

const predictionRecommendationUpdateSchema = z.object({
  title: z.string().min(4).max(STRING_MAX).optional(),
  summary: z.string().max(3000).optional().nullable(),
  recommendationType: z.string().max(64).optional().nullable(),
  marketType: z.string().max(64).optional().nullable(),
  selectionLabel: z.string().max(120).optional().nullable(),
  confidence: z.number().int().min(0).max(100).optional().nullable(),
  edgeScore: z.number().min(-100).max(100).optional().nullable(),
  isPublished: z.boolean().optional(),
  publishedAt: DATE_OR_EMPTY_SCHEMA,
  expiresAt: DATE_OR_EMPTY_SCHEMA,
  reviewStatus: z.enum(REVIEW_STATES).optional(),
  reviewNotes: z.string().max(2000).optional().nullable(),
  metadata: jsonSchema,
});

const monetizationPlacementUpdateSchema = z.object({
  surface: z.string().min(2).max(STRING_MAX).optional(),
  slotKey: z.string().min(2).max(STRING_MAX).optional(),
  placementType: z.string().min(2).max(STRING_MAX).optional(),
  title: z.string().max(STRING_MAX).optional().nullable(),
  description: z.string().max(3000).optional().nullable(),
  priority: z.number().int().min(0).max(9999).optional(),
  isActive: z.boolean().optional(),
  startsAt: DATE_OR_EMPTY_SCHEMA,
  endsAt: DATE_OR_EMPTY_SCHEMA,
  metadata: jsonSchema,
});

const issueCreateSchema = z.object({
  issueType: z.enum(ISSUE_TYPES),
  priority: z.enum(ISSUE_PRIORITIES).default("MEDIUM"),
  title: z.string().min(8).max(STRING_MAX),
  description: z.string().min(16).max(4000),
  entityType: z.string().max(64).optional().nullable(),
  entityId: z.string().max(STRING_MAX).optional().nullable(),
  fixtureId: z.string().max(STRING_MAX).optional().nullable(),
  articleId: z.string().max(STRING_MAX).optional().nullable(),
  assigneeUserId: z.string().max(STRING_MAX).optional().nullable(),
  metadata: jsonSchema,
});

const issueUpdateSchema = z.object({
  status: z.enum(ISSUE_STATUSES).optional(),
  priority: z.enum(ISSUE_PRIORITIES).optional(),
  title: z.string().min(8).max(STRING_MAX).optional(),
  description: z.string().min(16).max(4000).optional(),
  assigneeUserId: z.string().max(STRING_MAX).optional().nullable(),
  resolutionSummary: z.string().max(4000).optional().nullable(),
  metadata: jsonSchema,
});

const routeErrorSchema = z.object({
  route: z.string().min(1).max(250),
  boundary: z.string().min(1).max(120),
  digest: z.string().max(250).optional().nullable(),
  message: z.string().max(4000).optional().nullable(),
  metadata: jsonSchema,
});

function cleanOptionalString(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function mergeMetadata(existingMetadata, nextMetadata = null) {
  const existing =
    existingMetadata && typeof existingMetadata === "object" ? existingMetadata : {};
  const patch = nextMetadata && typeof nextMetadata === "object" ? nextMetadata : {};
  return { ...existing, ...patch };
}

function normalizeStringArray(value, { uppercase = false } = {}) {
  const items = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];

  return [...new Set(
    items
      .map((entry) => String(entry || "").trim())
      .filter(Boolean)
      .map((entry) => (uppercase ? entry.toUpperCase() : entry))
  )];
}

function parseOptionalDate(value) {
  const normalized = cleanOptionalString(value);
  if (!normalized) {
    return null;
  }

  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function roundMetric(value, digits = 4) {
  if (!Number.isFinite(value)) {
    return null;
  }

  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function mergeReviewMetadata(existingMetadata, { status, notes, actorUserId }) {
  const merged = mergeMetadata(existingMetadata, {});

  merged.editorialReview = {
    ...(merged.editorialReview && typeof merged.editorialReview === "object"
      ? merged.editorialReview
      : {}),
    ...(status ? { status } : {}),
    ...(notes !== undefined ? { notes: cleanOptionalString(notes) } : {}),
    reviewedBy: actorUserId || null,
    reviewedAt: new Date().toISOString(),
  };

  return merged;
}

function readReviewMetadata(metadata) {
  const review =
    metadata?.editorialReview && typeof metadata.editorialReview === "object"
      ? metadata.editorialReview
      : {};

  return {
    reviewStatus: REVIEW_STATES.includes(String(review.status || "").toUpperCase())
      ? String(review.status).toUpperCase()
      : "PENDING",
    reviewNotes: cleanOptionalString(review.notes),
    reviewedBy: cleanOptionalString(review.reviewedBy),
    reviewedAt: review.reviewedAt || null,
  };
}

function ageInMinutes(value) {
  if (!value) {
    return null;
  }

  return Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / (1000 * 60)));
}

function serializeUser(user) {
  return {
    id: user.id,
    email: user.email,
    phoneNumber: user.phoneNumber,
    loginIdentifier: getUserLoginIdentifier(user),
    username: user.username,
    displayName: user.displayName,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    roleNames: (user.roles || []).map((entry) => entry.role.name).sort(),
    sessionCount: user._count?.sessions || 0,
  };
}

function serializeShellModule(module) {
  const effectiveEnabled = Boolean(module?.isEnabled) && !Boolean(module?.emergencyDisabled);
  return {
    ...module,
    effectiveEnabled,
  };
}

function serializeIssue(issue) {
  return {
    ...issue,
    reporter: issue.reporter
      ? {
          id: issue.reporter.id,
          email: issue.reporter.email,
          phoneNumber: issue.reporter.phoneNumber,
          loginIdentifier: getUserLoginIdentifier(issue.reporter),
          username: issue.reporter.username,
        }
      : null,
    assignee: issue.assignee
      ? {
          id: issue.assignee.id,
          email: issue.assignee.email,
          phoneNumber: issue.assignee.phoneNumber,
          loginIdentifier: getUserLoginIdentifier(issue.assignee),
          username: issue.assignee.username,
        }
      : null,
    fixture: issue.fixture
      ? {
          id: issue.fixture.id,
          externalRef: issue.fixture.externalRef,
          status: issue.fixture.status,
          startsAt: issue.fixture.startsAt,
          label: `${issue.fixture.homeTeam?.name || "Home"} vs ${issue.fixture.awayTeam?.name || "Away"}`,
        }
      : null,
    article: issue.article
      ? {
          id: issue.article.id,
          slug: issue.article.slug,
          title: issue.article.title,
          status: issue.article.status,
        }
      : null,
  };
}

function serializeAuditLog(entry) {
  return {
    ...entry,
    actor: entry.actor
      ? {
          id: entry.actor.id,
          email: entry.actor.email,
          phoneNumber: entry.actor.phoneNumber,
          loginIdentifier: getUserLoginIdentifier(entry.actor),
          username: entry.actor.username,
        }
      : null,
  };
}

function serializeBookmaker(bookmaker) {
  return {
    ...bookmaker,
    sourceProvider: bookmaker.sourceProvider
      ? {
          id: bookmaker.sourceProvider.id,
          code: bookmaker.sourceProvider.code,
          name: bookmaker.sourceProvider.name,
        }
      : null,
    mappingCount: bookmaker._count?.affiliateLinks || 0,
    oddsMarketCount: bookmaker._count?.oddsMarkets || 0,
    predictionCount: bookmaker._count?.predictionRecommendations || 0,
  };
}

function serializeAffiliateLink(link) {
  return {
    ...link,
    bookmaker: link.bookmaker
      ? {
          id: link.bookmaker.id,
          code: link.bookmaker.code,
          slug: link.bookmaker.slug,
          name: link.bookmaker.name,
          shortName: link.bookmaker.shortName,
          isActive: link.bookmaker.isActive,
        }
      : null,
  };
}

function serializeFunnelEntry(entry) {
  return {
    ...entry,
    enabledGeos: normalizeStringArray(entry.enabledGeos, { uppercase: true }),
  };
}

function serializePredictionRecommendation(entry) {
  const review = readReviewMetadata(entry.metadata);

  return {
    ...entry,
    ...review,
    sourceProvider: entry.sourceProvider
      ? {
          id: entry.sourceProvider.id,
          code: entry.sourceProvider.code,
          name: entry.sourceProvider.name,
        }
      : null,
    fixture: entry.fixture
      ? {
          id: entry.fixture.id,
          externalRef: entry.fixture.externalRef,
          status: entry.fixture.status,
          startsAt: entry.fixture.startsAt,
          label: `${entry.fixture.homeTeam?.name || "Home"} vs ${entry.fixture.awayTeam?.name || "Away"}`,
        }
      : null,
    competition: entry.competition
      ? {
          id: entry.competition.id,
          code: entry.competition.code,
          name: entry.competition.name,
          shortName: entry.competition.shortName,
        }
      : null,
    bookmaker: entry.bookmaker
      ? {
          id: entry.bookmaker.id,
          code: entry.bookmaker.code,
          slug: entry.bookmaker.slug,
          name: entry.bookmaker.name,
          shortName: entry.bookmaker.shortName,
          isActive: entry.bookmaker.isActive,
        }
      : null,
  };
}

function getPlacementState(entry) {
  if (!entry?.isActive) {
    return "paused";
  }

  const now = Date.now();
  if (entry.startsAt && new Date(entry.startsAt).getTime() > now) {
    return "scheduled";
  }

  if (entry.endsAt && new Date(entry.endsAt).getTime() < now) {
    return "expired";
  }

  return "live";
}

function serializeMonetizationPlacement(entry) {
  const review = readReviewMetadata(entry.metadata);

  return {
    ...entry,
    ...review,
    state: getPlacementState(entry),
    bookmaker: entry.bookmaker
      ? {
          id: entry.bookmaker.id,
          code: entry.bookmaker.code,
          name: entry.bookmaker.name,
          shortName: entry.bookmaker.shortName,
        }
      : null,
    affiliateLink: entry.affiliateLink
      ? {
          id: entry.affiliateLink.id,
          key: entry.affiliateLink.key,
          territory: entry.affiliateLink.territory,
          surface: entry.affiliateLink.surface,
        }
      : null,
    funnelEntry: entry.funnelEntry
      ? {
          id: entry.funnelEntry.id,
          key: entry.funnelEntry.key,
          channel: entry.funnelEntry.channel,
          surface: entry.funnelEntry.surface,
        }
      : null,
    predictionRecommendation: entry.predictionRecommendation
      ? {
          id: entry.predictionRecommendation.id,
          key: entry.predictionRecommendation.key,
          title: entry.predictionRecommendation.title,
          isPublished: entry.predictionRecommendation.isPublished,
        }
      : null,
    adSlot: entry.adSlot
      ? {
          id: entry.adSlot.id,
          key: entry.adSlot.key,
          name: entry.adSlot.name,
          isEnabled: entry.adSlot.isEnabled,
        }
      : null,
    shellModule: entry.shellModule
      ? {
          id: entry.shellModule.id,
          key: entry.shellModule.key,
          name: entry.shellModule.name,
          effectiveEnabled:
            Boolean(entry.shellModule.isEnabled) &&
            !Boolean(entry.shellModule.emergencyDisabled),
        }
      : null,
  };
}

function buildCommercialSurfaceSummary(clickEvents = []) {
  return [...clickEvents.reduce((accumulator, event) => {
    const surface = event.surface || "unknown";

    if (!accumulator.has(surface)) {
      accumulator.set(surface, {
        surface,
        clicks: 0,
      });
    }

    accumulator.get(surface).clicks += 1;
    return accumulator;
  }, new Map()).values()]
    .sort((left, right) => right.clicks - left.clicks)
    .slice(0, 8);
}

function checkpointBudgetMs(key) {
  if (
    key === "fixtures:live" ||
    key === "fixtures:active-detail" ||
    key.startsWith("fixture-detail:")
  ) {
    return 1000 * 60 * 10;
  }

  if (key.startsWith("odds:")) {
    return 1000 * 60 * 20;
  }

  if (key === "bookmakers:catalog" || key === "predictions:catalog" || key.startsWith("predictions:")) {
    return 1000 * 60 * 60 * 12;
  }

  if (key.startsWith("broadcast:")) {
    return 1000 * 60 * 60 * 12;
  }

  if (key === "fixtures:window") {
    return 1000 * 60 * 60 * 12;
  }

  return 1000 * 60 * 60 * 36;
}

function checkpointState(checkpoint) {
  const latestSuccess = checkpoint.lastSuccessAt || checkpoint.updatedAt || checkpoint.createdAt;
  const latestFailure = checkpoint.lastFailureAt || null;
  const ageMs = latestSuccess ? Date.now() - new Date(latestSuccess).getTime() : Number.POSITIVE_INFINITY;
  const budgetMs = checkpointBudgetMs(checkpoint.key);

  if (latestFailure && (!latestSuccess || new Date(latestFailure) > new Date(latestSuccess))) {
    return "failed";
  }

  if (ageMs > budgetMs * 2) {
    return "critical";
  }

  if (ageMs > budgetMs) {
    return "warning";
  }

  return "healthy";
}

function summarizeCounts(items, getKey) {
  return items.reduce((accumulator, item) => {
    const key = getKey(item);
    accumulator[key] = (accumulator[key] || 0) + 1;
    return accumulator;
  }, {});
}

function getDependencyTimestamp(source, dependencyTimestamps) {
  return dependencyTimestamps[source] || null;
}

function buildCacheHealth(cacheAuditEvents, dependencyTimestamps) {
  const latestByTag = new Map();

  for (const entry of cacheAuditEvents) {
    if (!latestByTag.has(entry.entityId)) {
      latestByTag.set(entry.entityId, entry);
    }
  }

  return CACHE_TAG_DEPENDENCIES.map((entry) => {
    const lastRevalidated = latestByTag.get(entry.tag)?.createdAt || null;
    const dependencyUpdatedAt = getDependencyTimestamp(entry.source, dependencyTimestamps);

    let state = "healthy";
    if (!lastRevalidated) {
      state = dependencyUpdatedAt ? "attention" : "unknown";
    } else if (dependencyUpdatedAt && new Date(dependencyUpdatedAt) > new Date(lastRevalidated)) {
      state = "attention";
    }

    return {
      tag: entry.tag,
      label: entry.label,
      source: entry.source,
      state,
      lastRevalidatedAt: lastRevalidated,
      dependencyUpdatedAt,
      ageMinutes: ageInMinutes(lastRevalidated),
    };
  });
}

function buildRouteErrorSummary(events) {
  const oneHourAgo = Date.now() - 1000 * 60 * 60;
  const oneDayAgo = Date.now() - 1000 * 60 * 60 * 24;
  const groupedRoutes = [...events.reduce((accumulator, event) => {
    const route = event.route || "unknown";

    if (!accumulator.has(route)) {
      accumulator.set(route, {
        route,
        count: 0,
        lastSeenAt: null,
      });
    }

    const entry = accumulator.get(route);
    entry.count += 1;
    entry.lastSeenAt =
      !entry.lastSeenAt || new Date(event.createdAt) > new Date(entry.lastSeenAt)
        ? event.createdAt
        : entry.lastSeenAt;
    return accumulator;
  }, new Map()).values()]
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }

      return new Date(right.lastSeenAt || 0).getTime() - new Date(left.lastSeenAt || 0).getTime();
    })
    .slice(0, 8);

  return {
    lastHourCount: events.filter((event) => new Date(event.createdAt).getTime() >= oneHourAgo).length,
    last24HoursCount: events.filter((event) => new Date(event.createdAt).getTime() >= oneDayAgo).length,
    topRoutes: groupedRoutes,
  };
}

export function buildPublicModuleMap(modules = []) {
  const base = { ...PUBLIC_MODULE_DEFAULTS };

  for (const moduleEntry of modules) {
    if (!(moduleEntry.key in base)) {
      continue;
    }

    base[moduleEntry.key] =
      Boolean(moduleEntry.isEnabled) && !Boolean(moduleEntry.emergencyDisabled);
  }

  return base;
}

export async function getShellChromeContent(locale = "en") {
  const [adSlot, consentTexts, shellModules] = await Promise.all([
    db.adSlot.findFirst({
      where: {
        key: "shell_right_rail_primary",
      },
    }),
    db.consentText.findMany({
      where: {
        key: "shell_right_rail",
        locale: {
          in: [locale, "en"],
        },
      },
      orderBy: [{ locale: "asc" }, { version: "desc" }],
    }),
    db.shellModule.findMany({
      where: {
        key: {
          in: [
            "shell_right_rail_ad_slot",
            "shell_right_rail_consent",
            "shell_right_rail_support",
            "shell_right_rail_funnel_entry",
          ],
        },
      },
    }),
  ]);

  const consentByLocale = new Map(consentTexts.map((entry) => [entry.locale, entry]));

  return {
    adSlot,
    consentText: consentByLocale.get(locale) || consentByLocale.get("en") || null,
    shellModuleMap: buildPublicModuleMap(shellModules),
  };
}

export async function getPublicControlState() {
  const [featureFlags, shellModules] = await Promise.all([
    db.featureFlag.findMany({
      where: {
        key: {
          in: [
            "news_hub_enabled",
            "odds_surfaces_enabled",
            "broadcast_surfaces_enabled",
            "predictions_surfaces_enabled",
          ],
        },
      },
      select: {
        key: true,
        enabled: true,
      },
    }),
    db.shellModule.findMany({
      where: {
        key: {
          in: Object.keys(PUBLIC_MODULE_DEFAULTS),
        },
      },
    }),
  ]);

  const featureFlagMap = Object.fromEntries(
    featureFlags.map((entry) => [entry.key, entry.enabled])
  );
  const moduleMap = buildPublicModuleMap(shellModules);

  return {
    news: (featureFlagMap.news_hub_enabled ?? true) && moduleMap.news_hub,
    homeNews: (featureFlagMap.news_hub_enabled ?? true) && moduleMap.homepage_news_module,
    leagueNews: (featureFlagMap.news_hub_enabled ?? true) && moduleMap.league_news_module,
    teamNews: (featureFlagMap.news_hub_enabled ?? true) && moduleMap.team_news_module,
    liveNews: (featureFlagMap.news_hub_enabled ?? true) && moduleMap.live_news_strip,
    resultsNews: (featureFlagMap.news_hub_enabled ?? true) && moduleMap.results_news_strip,
    odds: featureFlagMap.odds_surfaces_enabled ?? true,
    fixtureOdds:
      (featureFlagMap.odds_surfaces_enabled ?? true) && moduleMap.fixture_odds,
    competitionOdds:
      (featureFlagMap.odds_surfaces_enabled ?? true) && moduleMap.competition_odds,
    broadcast: featureFlagMap.broadcast_surfaces_enabled ?? true,
    predictions: featureFlagMap.predictions_surfaces_enabled ?? true,
    fixtureBroadcast:
      (featureFlagMap.broadcast_surfaces_enabled ?? true) && moduleMap.fixture_broadcast,
    shellAdSlot: moduleMap.shell_right_rail_ad_slot,
    shellConsent: moduleMap.shell_right_rail_consent,
    shellSupport: moduleMap.shell_right_rail_support,
    shellFunnelEntry: moduleMap.shell_right_rail_funnel_entry,
    moduleMap,
  };
}

export async function getControlPlaneWorkspace() {
  return safeDataRead(async () => {
    const oneDayAgo = new Date(Date.now() - 1000 * 60 * 60 * 24);
    const syncConfig = getSportsSyncConfig();
    const providerRegistry = getRegisteredSportsProviders();
    const providerChain = getProviderChain(syncConfig.provider, syncConfig.fallbackProviders);

    const [
      roles,
      users,
      providers,
      featureFlags,
      shellModules,
      adSlots,
      consentTexts,
      bookmakers,
      affiliateLinks,
      funnelEntries,
      predictionRecommendations,
      monetizationPlacements,
      recentSyncJobs,
      recentCheckpoints,
      issues,
      recentAudits,
      cacheAuditEvents,
      recentRouteErrors,
      liveFixtureStaleCount,
      staleOddsCount,
      staleBroadcastCount,
      failedJobCount,
      clicksLast24Hours,
      conversionsLast24Hours,
      qualifiedConversionsLast24Hours,
      recentClickEvents,
      latestSuccessfulSync,
      latestNewsUpdate,
      latestFeatureUpdate,
      latestShellUpdate,
      observability,
      assetDelivery,
    ] = await Promise.all([
    db.role.findMany({
      orderBy: { name: "asc" },
      select: { name: true },
    }),
    db.user.findMany({
      orderBy: [{ createdAt: "desc" }],
      take: 24,
      include: {
        roles: {
          include: {
            role: true,
          },
        },
        _count: {
          select: {
            sessions: true,
          },
        },
      },
    }),
    db.sourceProvider.findMany({
      orderBy: { code: "asc" },
    }),
    db.featureFlag.findMany({
      orderBy: { key: "asc" },
    }),
    db.shellModule.findMany({
      orderBy: [{ location: "asc" }, { key: "asc" }],
    }),
    db.adSlot.findMany({
      orderBy: [{ placement: "asc" }, { key: "asc" }],
    }),
    db.consentText.findMany({
      orderBy: [{ key: "asc" }, { locale: "asc" }, { version: "desc" }],
    }),
    db.bookmaker.findMany({
      orderBy: [{ name: "asc" }],
      take: 24,
      include: {
        sourceProvider: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        _count: {
          select: {
            affiliateLinks: true,
            oddsMarkets: true,
            predictionRecommendations: true,
          },
        },
      },
    }),
    db.affiliateLink.findMany({
      orderBy: [{ priority: "asc" }, { key: "asc" }],
      take: 40,
      include: {
        bookmaker: {
          select: {
            id: true,
            code: true,
            slug: true,
            name: true,
            shortName: true,
            isActive: true,
          },
        },
      },
    }),
    db.funnelEntry.findMany({
      orderBy: [{ priority: "asc" }, { key: "asc" }],
      take: 24,
    }),
    db.predictionRecommendation.findMany({
      orderBy: [{ updatedAt: "desc" }],
      take: 24,
      include: {
        sourceProvider: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        fixture: {
          select: {
            id: true,
            externalRef: true,
            status: true,
            startsAt: true,
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
        competition: {
          select: {
            id: true,
            code: true,
            name: true,
            shortName: true,
          },
        },
        bookmaker: {
          select: {
            id: true,
            code: true,
            slug: true,
            name: true,
            shortName: true,
            isActive: true,
          },
        },
      },
    }),
    db.monetizationPlacement.findMany({
      orderBy: [{ surface: "asc" }, { priority: "asc" }, { key: "asc" }],
      take: 40,
      include: {
        bookmaker: {
          select: {
            id: true,
            code: true,
            name: true,
            shortName: true,
          },
        },
        affiliateLink: {
          select: {
            id: true,
            key: true,
            territory: true,
            surface: true,
          },
        },
        funnelEntry: {
          select: {
            id: true,
            key: true,
            channel: true,
            surface: true,
          },
        },
        predictionRecommendation: {
          select: {
            id: true,
            key: true,
            title: true,
            isPublished: true,
          },
        },
        adSlot: {
          select: {
            id: true,
            key: true,
            name: true,
            isEnabled: true,
          },
        },
        shellModule: {
          select: {
            id: true,
            key: true,
            name: true,
            isEnabled: true,
            emergencyDisabled: true,
          },
        },
      },
    }),
    db.syncJob.findMany({
      orderBy: [{ createdAt: "desc" }],
      take: 20,
    }),
    db.syncCheckpoint.findMany({
      orderBy: [{ updatedAt: "desc" }],
      take: 30,
    }),
    db.opsIssue.findMany({
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      take: 30,
      include: {
        reporter: {
          select: {
            id: true,
            email: true,
            phoneNumber: true,
            username: true,
          },
        },
        assignee: {
          select: {
            id: true,
            email: true,
            phoneNumber: true,
            username: true,
          },
        },
        fixture: {
          select: {
            id: true,
            externalRef: true,
            status: true,
            startsAt: true,
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
        article: {
          select: {
            id: true,
            slug: true,
            title: true,
            status: true,
          },
        },
      },
    }),
    db.auditLog.findMany({
      orderBy: [{ createdAt: "desc" }],
      take: 40,
      include: {
        actor: {
          select: {
            id: true,
            email: true,
            phoneNumber: true,
            username: true,
          },
        },
      },
    }),
    db.auditLog.findMany({
      where: {
        entityType: "CacheTag",
        entityId: {
          in: KNOWN_CACHE_TAGS,
        },
      },
      orderBy: [{ createdAt: "desc" }],
      take: 200,
    }),
    db.routeErrorEvent.findMany({
      where: {
        createdAt: {
          gte: oneDayAgo,
        },
      },
      orderBy: [{ createdAt: "desc" }],
      take: 200,
    }),
    db.fixture.count({
      where: {
        status: "LIVE",
        OR: [
          { lastSyncedAt: null },
          {
            lastSyncedAt: {
              lt: new Date(Date.now() - 1000 * 60 * 8),
            },
          },
        ],
      },
    }),
    db.oddsMarket.count({
      where: {
        OR: [
          { lastSyncedAt: null },
          {
            lastSyncedAt: {
              lt: new Date(Date.now() - 1000 * 60 * 20),
            },
          },
        ],
      },
    }),
    db.broadcastChannel.count({
      where: {
        isActive: true,
        updatedAt: {
          lt: new Date(Date.now() - 1000 * 60 * 60 * 12),
        },
      },
    }),
    db.syncJob.count({
      where: {
        status: "FAILED",
        createdAt: {
          gte: oneDayAgo,
        },
      },
    }),
    db.clickEvent.count({
      where: {
        createdAt: {
          gte: oneDayAgo,
        },
      },
    }),
    db.conversionEvent.count({
      where: {
        createdAt: {
          gte: oneDayAgo,
        },
      },
    }),
    db.conversionEvent.count({
      where: {
        createdAt: {
          gte: oneDayAgo,
        },
        status: {
          in: ["APPROVED", "SETTLED"],
        },
      },
    }),
    db.clickEvent.findMany({
      where: {
        createdAt: {
          gte: oneDayAgo,
        },
      },
      orderBy: [{ createdAt: "desc" }],
      take: 200,
      select: {
        surface: true,
      },
    }),
    db.syncJob.findFirst({
      where: {
        status: "SUCCESS",
      },
      orderBy: [{ finishedAt: "desc" }, { createdAt: "desc" }],
      select: {
        finishedAt: true,
      },
    }),
    db.newsArticle.findFirst({
      orderBy: [{ updatedAt: "desc" }],
      select: {
        updatedAt: true,
      },
    }),
    db.featureFlag.findFirst({
      orderBy: [{ updatedAt: "desc" }],
      select: {
        updatedAt: true,
      },
    }),
    db.shellModule.findFirst({
      orderBy: [{ updatedAt: "desc" }],
      select: {
        updatedAt: true,
      },
    }),
    getOperationalDashboardSnapshot(),
    getAssetDeliverySnapshot(),
  ]);

    const checkpointHealth = recentCheckpoints.map((checkpoint) => ({
      ...checkpoint,
      lagMinutes: ageInMinutes(checkpoint.lastSuccessAt || checkpoint.updatedAt),
      state: checkpointState(checkpoint),
    }));

    const dependencyTimestamps = {
      sync: latestSuccessfulSync?.finishedAt || null,
      news: latestNewsUpdate?.updatedAt || null,
      flags: latestFeatureUpdate?.updatedAt || null,
      shell: latestShellUpdate?.updatedAt || null,
    };
    const cacheHealth = buildCacheHealth(cacheAuditEvents, dependencyTimestamps);
    const openIssues = issues.filter(
      (issue) => !["RESOLVED", "DISMISSED"].includes(issue.status)
    );
    const serializedPlacements = monetizationPlacements.map(serializeMonetizationPlacement);
    const livePlacements = serializedPlacements.filter((entry) => entry.state === "live");
    const placementAttentionCount = serializedPlacements.filter((entry) => {
      const hasBackingReference =
        entry.affiliateLink ||
        entry.funnelEntry ||
        entry.predictionRecommendation ||
        entry.adSlot ||
        entry.shellModule;

      return entry.isActive && (entry.state !== "live" || !hasBackingReference);
    }).length;
    const adSlotsWithoutPlacements = adSlots.filter(
      (slot) =>
        slot.isEnabled &&
        !livePlacements.some((placement) => placement.adSlot?.id === slot.id)
    ).length;
    const commercialSummary = {
      activeBookmakers: bookmakers.filter((entry) => entry.isActive).length,
      activeAffiliateLinks: affiliateLinks.filter((entry) => entry.isActive).length,
      activeFunnelEntries: funnelEntries.filter((entry) => entry.isActive).length,
      livePlacements: livePlacements.length,
      publishedPredictions: predictionRecommendations.filter((entry) => entry.isPublished).length,
      clicksLast24Hours,
      conversionsLast24Hours,
      qualifiedConversionsLast24Hours,
      conversionRate: clicksLast24Hours
        ? roundMetric(qualifiedConversionsLast24Hours / clicksLast24Hours)
        : null,
      activeAdSlots: adSlots.filter((entry) => entry.isEnabled).length,
      adSlotsWithoutPlacements,
      placementAttentionCount,
    };

    return {
      roles: roles.map((entry) => entry.name),
      users: users.map(serializeUser),
      providers: providers.map((provider) => {
        const descriptor = providerRegistry.find((entry) => entry.code === provider.code);

        return {
          ...provider,
          registry: descriptor || null,
        };
      }),
      providerRegistry,
      providerChain,
      providerSelection: {
        code: syncConfig.provider,
        name: syncConfig.providerDescriptor?.name || syncConfig.provider,
        adapterFamily: syncConfig.adapterFamily,
        implemented: syncConfig.providerImplemented,
        envNamespace: syncConfig.providerEnvNamespace,
        supportedSports: syncConfig.supportedSports || [],
        capabilities: syncConfig.providerDescriptor?.capabilities || [],
        enabledCapabilities: Object.entries(syncConfig.supports || {})
          .filter(([, enabled]) => enabled)
          .map(([capability]) => capability),
        fallbackProviders: providerChain
          .filter((entry) => entry.code !== syncConfig.provider)
          .map((entry) => ({
            code: entry.code,
            name: entry.name,
            implemented: entry.implemented,
            capabilities: entry.capabilities,
          })),
      },
      featureFlags,
      shellModules: shellModules.map(serializeShellModule),
      adSlots,
      consentTexts,
      commercial: {
        bookmakers: bookmakers.map(serializeBookmaker),
        affiliateLinks: affiliateLinks.map(serializeAffiliateLink),
        funnelEntries: funnelEntries.map(serializeFunnelEntry),
        predictionRecommendations: predictionRecommendations.map(
          serializePredictionRecommendation
        ),
        monetizationPlacements: serializedPlacements,
        topSurfaces: buildCommercialSurfaceSummary(recentClickEvents),
        summary: commercialSummary,
      },
      sync: {
        recentJobs: recentSyncJobs,
        checkpoints: checkpointHealth,
        summary: {
          failedJobsLast24Hours: failedJobCount,
          checkpointStates: summarizeCounts(checkpointHealth, (checkpoint) => checkpoint.state),
        },
      },
      issues: {
        items: issues.map(serializeIssue),
        summary: {
          total: issues.length,
          byStatus: summarizeCounts(issues, (issue) => issue.status),
          openByType: summarizeCounts(openIssues, (issue) => issue.issueType),
        },
      },
      ops: {
        staleData: {
          liveFixtures: liveFixtureStaleCount,
          oddsMarkets: staleOddsCount,
          broadcastChannels: staleBroadcastCount,
        },
        cacheHealth,
        routeErrors: {
          events: recentRouteErrors,
          summary: buildRouteErrorSummary(recentRouteErrors),
        },
        observability,
      },
      assets: assetDelivery,
      auditTrail: recentAudits.map(serializeAuditLog),
      summary: {
        adminUsers: users.filter((user) =>
          user.roles.some((entry) => entry.role.name === "ADMIN")
        ).length,
        activeProviders: providers.filter((provider) => provider.isActive).length,
        openIssues: openIssues.length,
        cacheAttentionCount: cacheHealth.filter((entry) => entry.state === "attention").length,
        drillRunsLast24Hours: observability.summary.drillRunsLast24Hours,
        routeErrorsLastHour: observability.summary.routeErrorsLastHour,
        commercialAttentionCount:
          placementAttentionCount +
          adSlotsWithoutPlacements +
          openIssues.filter((issue) =>
            ["BROKEN_AFFILIATE_DESTINATION", "COMPLIANCE_INCIDENT"].includes(issue.issueType)
          ).length,
      },
    };
  }, EMPTY_CONTROL_PLANE_WORKSPACE, {
    label: "Control plane workspace",
  });
}

async function ensureRoleRecords(tx, roleNames) {
  await Promise.all(
    roleNames.map((name) =>
      tx.role.upsert({
        where: { name },
        update: {},
        create: {
          name,
          description: `${name} role`,
        },
      })
    )
  );

  return tx.role.findMany({
    where: {
      name: {
        in: roleNames,
      },
    },
  });
}

export async function updateUserAdminState(userId, payload, auditContext = {}) {
  const input = userUpdateSchema.parse(payload);

  const updatedUser = await db.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!existing) {
      throw new Error("User not found.");
    }

    if (auditContext.actorUserId === userId) {
      if (input.isActive === false) {
        throw new Error("You cannot deactivate your own account.");
      }

      if (input.roles && !input.roles.includes("ADMIN")) {
        throw new Error("You cannot remove your own admin role.");
      }
    }

    if (input.roles) {
      const roles = await ensureRoleRecords(tx, input.roles);
      const roleIds = roles.map((entry) => entry.id);

      await tx.userRole.deleteMany({
        where: {
          userId,
          roleId: {
            notIn: roleIds,
          },
        },
      });

      for (const role of roles) {
        await tx.userRole.upsert({
          where: {
            userId_roleId: {
              userId,
              roleId: role.id,
            },
          },
          update: {},
          create: {
            userId,
            roleId: role.id,
          },
        });
      }
    }

    return tx.user.update({
      where: { id: userId },
      data: {
        ...(typeof input.isActive === "boolean" ? { isActive: input.isActive } : {}),
      },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
        _count: {
          select: {
            sessions: true,
          },
        },
      },
    });
  });

  await logAuditEvent({
    ...auditContext,
    action: "admin.user.updated",
    entityType: "User",
    entityId: userId,
    metadata: input,
  });

  return serializeUser(updatedUser);
}

export async function updateSourceProviderControl(providerCode, payload, auditContext = {}) {
  const input = providerUpdateSchema.parse(payload);
  const existing = await db.sourceProvider.findUnique({
    where: {
      code: providerCode,
    },
  });

  if (!existing) {
    throw new Error("Provider not found.");
  }

  const updated = await db.sourceProvider.update({
    where: {
      code: providerCode,
    },
    data: {
      ...(typeof input.isActive === "boolean" ? { isActive: input.isActive } : {}),
      ...(input.name ? { name: input.name.trim() } : {}),
      ...(input.kind !== undefined ? { kind: cleanOptionalString(input.kind) } : {}),
      metadata:
        input.note !== undefined || input.metadata
          ? mergeMetadata(existing.metadata, {
              ...(input.metadata || {}),
              adminNote: cleanOptionalString(input.note),
              updatedBy: auditContext.actorUserId || null,
              updatedAt: new Date().toISOString(),
            })
          : existing.metadata,
    },
  });

  await logAuditEvent({
    ...auditContext,
    action: "admin.provider.updated",
    entityType: "SourceProvider",
    entityId: providerCode,
    metadata: input,
  });

  return updated;
}

export async function updateFeatureFlagControl(key, payload, auditContext = {}) {
  const input = featureFlagUpdateSchema.parse(payload);

  const flag = await db.featureFlag.upsert({
    where: {
      key,
    },
    update: {
      enabled: input.enabled,
      description: cleanOptionalString(input.description),
    },
    create: {
      key,
      enabled: input.enabled,
      description: cleanOptionalString(input.description),
    },
  });

  await logAuditEvent({
    ...auditContext,
    action: "admin.feature_flag.updated",
    entityType: "FeatureFlag",
    entityId: key,
    metadata: input,
  });

  await revalidateTagsWithAudit([...FEATURE_CACHE_TAGS], {
    ...auditContext,
    source: "feature-flag-update",
    metadata: {
      key,
    },
  });

  return flag;
}

export async function updateShellModuleControl(key, payload, auditContext = {}) {
  const input = shellModuleUpdateSchema.parse(payload);
  const existing = await db.shellModule.findUnique({
    where: {
      key,
    },
  });

  if (!existing) {
    throw new Error("Shell module not found.");
  }

  const shellModule = await db.shellModule.update({
    where: {
      key,
    },
    data: {
      ...(input.name ? { name: input.name.trim() } : {}),
      ...(input.location ? { location: input.location.trim() } : {}),
      ...(input.description !== undefined ? { description: cleanOptionalString(input.description) } : {}),
      ...(typeof input.isEnabled === "boolean" ? { isEnabled: input.isEnabled } : {}),
      ...(typeof input.emergencyDisabled === "boolean"
        ? { emergencyDisabled: input.emergencyDisabled }
        : {}),
      ...(input.emergencyReason !== undefined
        ? { emergencyReason: cleanOptionalString(input.emergencyReason) }
        : {}),
      ...(input.metadata ? { metadata: mergeMetadata(existing.metadata, input.metadata) } : {}),
    },
  });

  await logAuditEvent({
    ...auditContext,
    action: "admin.shell_module.updated",
    entityType: "ShellModule",
    entityId: key,
    metadata: input,
  });

  await revalidateTagsWithAudit([...FEATURE_CACHE_TAGS, "coreui:shell"], {
    ...auditContext,
    source: "shell-module-update",
    metadata: {
      key,
    },
  });

  return serializeShellModule(shellModule);
}

export async function updateAdSlotControl(key, payload, auditContext = {}) {
  const input = adSlotUpdateSchema.parse(payload);
  const existing = await db.adSlot.findUnique({
    where: {
      key,
    },
  });

  const adSlot = await db.adSlot.upsert({
    where: {
      key,
    },
    update: {
      name: input.name.trim(),
      placement: input.placement.trim(),
      size: cleanOptionalString(input.size),
      copy: cleanOptionalString(input.copy),
      ctaLabel: cleanOptionalString(input.ctaLabel),
      ctaUrl: cleanOptionalString(input.ctaUrl),
      isEnabled: input.isEnabled,
      metadata: input.metadata ? mergeMetadata(existing?.metadata, input.metadata) : existing?.metadata,
    },
    create: {
      key,
      name: input.name.trim(),
      placement: input.placement.trim(),
      size: cleanOptionalString(input.size),
      copy: cleanOptionalString(input.copy),
      ctaLabel: cleanOptionalString(input.ctaLabel),
      ctaUrl: cleanOptionalString(input.ctaUrl),
      isEnabled: input.isEnabled,
      metadata: input.metadata || null,
    },
  });

  await logAuditEvent({
    ...auditContext,
    action: "admin.ad_slot.updated",
    entityType: "AdSlot",
    entityId: key,
    metadata: input,
  });

  await revalidateTagsWithAudit(["coreui:shell"], {
    ...auditContext,
    source: "ad-slot-update",
    metadata: {
      key,
    },
  });

  return adSlot;
}

export async function updateConsentTextControl(key, payload, auditContext = {}) {
  const input = consentTextUpdateSchema.parse(payload);
  const existing = await db.consentText.findUnique({
    where: {
      key_locale: {
        key,
        locale: input.locale,
      },
    },
  });

  const consentText = await db.consentText.upsert({
    where: {
      key_locale: {
        key,
        locale: input.locale,
      },
    },
    update: {
      title: input.title.trim(),
      body: input.body.trim(),
      version: input.version || existing?.version || 1,
      isActive: input.isActive,
      metadata: input.metadata ? mergeMetadata(existing?.metadata, input.metadata) : existing?.metadata,
    },
    create: {
      key,
      locale: input.locale,
      title: input.title.trim(),
      body: input.body.trim(),
      version: input.version || 1,
      isActive: input.isActive,
      metadata: input.metadata || null,
    },
  });

  await logAuditEvent({
    ...auditContext,
    action: "admin.consent_text.updated",
    entityType: "ConsentText",
    entityId: `${key}:${input.locale}`,
    metadata: input,
  });

  await revalidateTagsWithAudit(["coreui:shell"], {
    ...auditContext,
    source: "consent-text-update",
    metadata: {
      key,
      locale: input.locale,
    },
  });

  return consentText;
}

async function revalidateCommercialReads(source, auditContext, metadata = {}) {
  await revalidateTagsWithAudit(COMMERCIAL_CACHE_TAGS, {
    ...auditContext,
    source,
    metadata,
  });
}

export async function updateBookmakerControl(code, payload, auditContext = {}) {
  const input = bookmakerUpdateSchema.parse(payload);
  const existing = await db.bookmaker.findUnique({
    where: {
      code,
    },
  });

  if (!existing) {
    throw new Error("Bookmaker not found.");
  }

  const bookmaker = await db.bookmaker.update({
    where: {
      code,
    },
    data: {
      ...(input.name ? { name: input.name.trim() } : {}),
      ...(input.shortName !== undefined ? { shortName: cleanOptionalString(input.shortName) } : {}),
      ...(input.websiteUrl !== undefined
        ? { websiteUrl: cleanOptionalString(input.websiteUrl) }
        : {}),
      ...(input.affiliateBaseUrl !== undefined
        ? { affiliateBaseUrl: cleanOptionalString(input.affiliateBaseUrl) }
        : {}),
      ...(typeof input.isActive === "boolean" ? { isActive: input.isActive } : {}),
      ...(input.metadata ? { metadata: mergeMetadata(existing.metadata, input.metadata) } : {}),
    },
    include: {
      sourceProvider: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
      _count: {
        select: {
          affiliateLinks: true,
          oddsMarkets: true,
          predictionRecommendations: true,
        },
      },
    },
  });

  await logAuditEvent({
    ...auditContext,
    action: "admin.bookmaker.updated",
    entityType: "Bookmaker",
    entityId: code,
    metadata: input,
  });

  await revalidateCommercialReads("bookmaker-update", auditContext, { code });

  return serializeBookmaker(bookmaker);
}

export async function updateAffiliateLinkControl(key, payload, auditContext = {}) {
  const input = affiliateLinkUpdateSchema.parse(payload);

  const affiliateLink = await db.$transaction(async (tx) => {
    const existing = await tx.affiliateLink.findUnique({
      where: {
        key,
      },
      include: {
        bookmaker: {
          select: {
            id: true,
            code: true,
            slug: true,
            name: true,
            shortName: true,
            isActive: true,
          },
        },
      },
    });

    if (!existing) {
      throw new Error("Affiliate link not found.");
    }

    const nextTerritory =
      input.territory !== undefined ? cleanOptionalString(input.territory) : existing.territory;
    const nextSurface =
      input.surface !== undefined ? cleanOptionalString(input.surface) : existing.surface;
    const nextLocale =
      input.locale !== undefined ? cleanOptionalString(input.locale) : existing.locale;

    if (input.isDefault === true) {
      await tx.affiliateLink.updateMany({
        where: {
          id: {
            not: existing.id,
          },
          bookmakerId: existing.bookmakerId,
          territory: nextTerritory,
          surface: nextSurface,
          locale: nextLocale,
        },
        data: {
          isDefault: false,
        },
      });
    }

    return tx.affiliateLink.update({
      where: {
        key,
      },
      data: {
        ...(input.territory !== undefined ? { territory: nextTerritory } : {}),
        ...(input.locale !== undefined ? { locale: nextLocale } : {}),
        ...(input.surface !== undefined ? { surface: nextSurface } : {}),
        ...(input.linkType !== undefined ? { linkType: cleanOptionalString(input.linkType) } : {}),
        ...(input.destinationUrl ? { destinationUrl: input.destinationUrl.trim() } : {}),
        ...(input.trackingTemplate !== undefined
          ? { trackingTemplate: cleanOptionalString(input.trackingTemplate) }
          : {}),
        ...(input.fallbackUrl !== undefined
          ? { fallbackUrl: cleanOptionalString(input.fallbackUrl) }
          : {}),
        ...(typeof input.isDefault === "boolean" ? { isDefault: input.isDefault } : {}),
        ...(typeof input.isActive === "boolean" ? { isActive: input.isActive } : {}),
        ...(Number.isFinite(input.priority) ? { priority: input.priority } : {}),
        ...(input.metadata ? { metadata: mergeMetadata(existing.metadata, input.metadata) } : {}),
      },
      include: {
        bookmaker: {
          select: {
            id: true,
            code: true,
            slug: true,
            name: true,
            shortName: true,
            isActive: true,
          },
        },
      },
    });
  });

  await logAuditEvent({
    ...auditContext,
    action: "admin.affiliate_link.updated",
    entityType: "AffiliateLink",
    entityId: key,
    metadata: input,
  });

  await revalidateCommercialReads("affiliate-link-update", auditContext, { key });

  return serializeAffiliateLink(affiliateLink);
}

export async function updateFunnelEntryControl(key, payload, auditContext = {}) {
  const input = funnelEntryUpdateSchema.parse(payload);
  const existing = await db.funnelEntry.findUnique({
    where: {
      key,
    },
  });

  if (!existing) {
    throw new Error("Funnel entry not found.");
  }

  const funnelEntry = await db.funnelEntry.update({
    where: {
      key,
    },
    data: {
      ...(input.channel ? { channel: input.channel.trim() } : {}),
      ...(input.surface ? { surface: input.surface.trim() } : {}),
      ...(input.title ? { title: input.title.trim() } : {}),
      ...(input.description !== undefined ? { description: cleanOptionalString(input.description) } : {}),
      ...(input.ctaLabel ? { ctaLabel: input.ctaLabel.trim() } : {}),
      ...(input.ctaUrl ? { ctaUrl: input.ctaUrl.trim() } : {}),
      ...(input.territory !== undefined ? { territory: cleanOptionalString(input.territory) } : {}),
      ...(input.enabledGeos !== undefined
        ? { enabledGeos: normalizeStringArray(input.enabledGeos, { uppercase: true }) }
        : {}),
      ...(typeof input.isActive === "boolean" ? { isActive: input.isActive } : {}),
      ...(Number.isFinite(input.priority) ? { priority: input.priority } : {}),
      ...(input.metadata ? { metadata: mergeMetadata(existing.metadata, input.metadata) } : {}),
    },
  });

  await logAuditEvent({
    ...auditContext,
    action: "admin.funnel_entry.updated",
    entityType: "FunnelEntry",
    entityId: key,
    metadata: input,
  });

  await revalidateCommercialReads("funnel-entry-update", auditContext, { key });

  return serializeFunnelEntry(funnelEntry);
}

export async function updatePredictionRecommendationControl(
  key,
  payload,
  auditContext = {}
) {
  const input = predictionRecommendationUpdateSchema.parse(payload);
  const existing = await db.predictionRecommendation.findUnique({
    where: {
      key,
    },
    include: {
      sourceProvider: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
      fixture: {
        select: {
          id: true,
          externalRef: true,
          status: true,
          startsAt: true,
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
      competition: {
        select: {
          id: true,
          code: true,
          name: true,
          shortName: true,
        },
      },
      bookmaker: {
        select: {
          id: true,
          code: true,
          slug: true,
          name: true,
          shortName: true,
          isActive: true,
        },
      },
    },
  });

  if (!existing) {
    throw new Error("Prediction recommendation not found.");
  }

  const metadataBase =
    input.reviewStatus || input.reviewNotes !== undefined
      ? mergeReviewMetadata(existing.metadata, {
          status: input.reviewStatus,
          notes: input.reviewNotes,
          actorUserId: auditContext.actorUserId || null,
        })
      : mergeMetadata(existing.metadata, input.metadata);
  const metadata =
    input.metadata && (input.reviewStatus || input.reviewNotes !== undefined)
      ? mergeMetadata(metadataBase, input.metadata)
      : metadataBase;

  const recommendation = await db.predictionRecommendation.update({
    where: {
      key,
    },
    data: {
      ...(input.title ? { title: input.title.trim() } : {}),
      ...(input.summary !== undefined ? { summary: cleanOptionalString(input.summary) } : {}),
      ...(input.recommendationType !== undefined
        ? { recommendationType: cleanOptionalString(input.recommendationType) || "PICK" }
        : {}),
      ...(input.marketType !== undefined ? { marketType: cleanOptionalString(input.marketType) } : {}),
      ...(input.selectionLabel !== undefined
        ? { selectionLabel: cleanOptionalString(input.selectionLabel) }
        : {}),
      ...(input.confidence !== undefined ? { confidence: input.confidence } : {}),
      ...(input.edgeScore !== undefined ? { edgeScore: input.edgeScore } : {}),
      ...(typeof input.isPublished === "boolean" ? { isPublished: input.isPublished } : {}),
      ...(input.publishedAt !== undefined ? { publishedAt: parseOptionalDate(input.publishedAt) } : {}),
      ...(input.expiresAt !== undefined ? { expiresAt: parseOptionalDate(input.expiresAt) } : {}),
      metadata,
    },
    include: {
      sourceProvider: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
      fixture: {
        select: {
          id: true,
          externalRef: true,
          status: true,
          startsAt: true,
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
      competition: {
        select: {
          id: true,
          code: true,
          name: true,
          shortName: true,
        },
      },
      bookmaker: {
        select: {
          id: true,
          code: true,
          slug: true,
          name: true,
          shortName: true,
          isActive: true,
        },
      },
    },
  });

  await logAuditEvent({
    ...auditContext,
    action: "editor.prediction_recommendation.updated",
    entityType: "PredictionRecommendation",
    entityId: key,
    metadata: input,
  });

  await revalidateCommercialReads("prediction-recommendation-update", auditContext, { key });

  return serializePredictionRecommendation(recommendation);
}

export async function updateMonetizationPlacementControl(key, payload, auditContext = {}) {
  const input = monetizationPlacementUpdateSchema.parse(payload);
  const existing = await db.monetizationPlacement.findUnique({
    where: {
      key,
    },
    include: {
      bookmaker: {
        select: {
          id: true,
          code: true,
          name: true,
          shortName: true,
        },
      },
      affiliateLink: {
        select: {
          id: true,
          key: true,
          territory: true,
          surface: true,
        },
      },
      funnelEntry: {
        select: {
          id: true,
          key: true,
          channel: true,
          surface: true,
        },
      },
      predictionRecommendation: {
        select: {
          id: true,
          key: true,
          title: true,
          isPublished: true,
        },
      },
      adSlot: {
        select: {
          id: true,
          key: true,
          name: true,
          isEnabled: true,
        },
      },
      shellModule: {
        select: {
          id: true,
          key: true,
          name: true,
          isEnabled: true,
          emergencyDisabled: true,
        },
      },
    },
  });

  if (!existing) {
    throw new Error("Monetization placement not found.");
  }

  const placement = await db.monetizationPlacement.update({
    where: {
      key,
    },
    data: {
      ...(input.surface ? { surface: input.surface.trim() } : {}),
      ...(input.slotKey ? { slotKey: input.slotKey.trim() } : {}),
      ...(input.placementType ? { placementType: input.placementType.trim() } : {}),
      ...(input.title !== undefined ? { title: cleanOptionalString(input.title) } : {}),
      ...(input.description !== undefined
        ? { description: cleanOptionalString(input.description) }
        : {}),
      ...(Number.isFinite(input.priority) ? { priority: input.priority } : {}),
      ...(typeof input.isActive === "boolean" ? { isActive: input.isActive } : {}),
      ...(input.startsAt !== undefined ? { startsAt: parseOptionalDate(input.startsAt) } : {}),
      ...(input.endsAt !== undefined ? { endsAt: parseOptionalDate(input.endsAt) } : {}),
      ...(input.metadata ? { metadata: mergeMetadata(existing.metadata, input.metadata) } : {}),
    },
    include: {
      bookmaker: {
        select: {
          id: true,
          code: true,
          name: true,
          shortName: true,
        },
      },
      affiliateLink: {
        select: {
          id: true,
          key: true,
          territory: true,
          surface: true,
        },
      },
      funnelEntry: {
        select: {
          id: true,
          key: true,
          channel: true,
          surface: true,
        },
      },
      predictionRecommendation: {
        select: {
          id: true,
          key: true,
          title: true,
          isPublished: true,
        },
      },
      adSlot: {
        select: {
          id: true,
          key: true,
          name: true,
          isEnabled: true,
        },
      },
      shellModule: {
        select: {
          id: true,
          key: true,
          name: true,
          isEnabled: true,
          emergencyDisabled: true,
        },
      },
    },
  });

  await logAuditEvent({
    ...auditContext,
    action: "admin.monetization_placement.updated",
    entityType: "MonetizationPlacement",
    entityId: key,
    metadata: input,
  });

  await revalidateCommercialReads("monetization-placement-update", auditContext, { key });

  return serializeMonetizationPlacement(placement);
}

export async function createOpsIssue(payload, auditContext = {}) {
  const input = issueCreateSchema.parse(payload);

  const issue = await db.opsIssue.create({
    data: {
      issueType: input.issueType,
      priority: input.priority,
      title: input.title.trim(),
      description: input.description.trim(),
      entityType: cleanOptionalString(input.entityType),
      entityId: cleanOptionalString(input.entityId),
      fixtureId: cleanOptionalString(input.fixtureId),
      articleId: cleanOptionalString(input.articleId),
      reporterUserId: auditContext.actorUserId || null,
      assigneeUserId: cleanOptionalString(input.assigneeUserId),
      metadata: input.metadata || null,
    },
    include: {
      reporter: {
        select: {
          id: true,
          email: true,
          phoneNumber: true,
          username: true,
        },
      },
      assignee: {
        select: {
          id: true,
          email: true,
          phoneNumber: true,
          username: true,
        },
      },
      fixture: {
        select: {
          id: true,
          externalRef: true,
          status: true,
          startsAt: true,
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
      article: {
        select: {
          id: true,
          slug: true,
          title: true,
          status: true,
        },
      },
    },
  });

  await logAuditEvent({
    ...auditContext,
    action: "ops.issue.created",
    entityType: "OpsIssue",
    entityId: issue.id,
    metadata: input,
  });

  return serializeIssue(issue);
}

export async function updateOpsIssue(issueId, payload, auditContext = {}) {
  const input = issueUpdateSchema.parse(payload);
  const existing = await db.opsIssue.findUnique({
    where: {
      id: issueId,
    },
  });

  if (!existing) {
    throw new Error("Issue not found.");
  }

  const nextStatus = input.status || existing.status;
  const shouldSetResolvedAt = ["RESOLVED", "DISMISSED"].includes(nextStatus);

  const issue = await db.opsIssue.update({
    where: {
      id: issueId,
    },
    data: {
      ...(input.status ? { status: input.status } : {}),
      ...(input.priority ? { priority: input.priority } : {}),
      ...(input.title ? { title: input.title.trim() } : {}),
      ...(input.description ? { description: input.description.trim() } : {}),
      ...(input.assigneeUserId !== undefined
        ? { assigneeUserId: cleanOptionalString(input.assigneeUserId) }
        : {}),
      ...(input.resolutionSummary !== undefined
        ? { resolutionSummary: cleanOptionalString(input.resolutionSummary) }
        : {}),
      ...(input.metadata
        ? { metadata: mergeMetadata(existing.metadata, input.metadata) }
        : {}),
      resolvedAt: shouldSetResolvedAt ? new Date() : null,
    },
    include: {
      reporter: {
        select: {
          id: true,
          email: true,
          phoneNumber: true,
          username: true,
        },
      },
      assignee: {
        select: {
          id: true,
          email: true,
          phoneNumber: true,
          username: true,
        },
      },
      fixture: {
        select: {
          id: true,
          externalRef: true,
          status: true,
          startsAt: true,
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
      article: {
        select: {
          id: true,
          slug: true,
          title: true,
          status: true,
        },
      },
    },
  });

  await logAuditEvent({
    ...auditContext,
    action: "ops.issue.updated",
    entityType: "OpsIssue",
    entityId: issueId,
    metadata: input,
  });

  return serializeIssue(issue);
}

export async function recordRouteErrorEvent(payload) {
  const input = routeErrorSchema.parse(payload);

  return db.routeErrorEvent.create({
    data: {
      route: input.route.trim(),
      boundary: input.boundary.trim(),
      digest: cleanOptionalString(input.digest),
      message: cleanOptionalString(input.message),
      metadata: input.metadata || null,
    },
  });
}

export async function manualRevalidateCache(tags, auditContext = {}) {
  const uniqueTags = [...new Set((tags || []).filter((tag) => KNOWN_CACHE_TAGS.includes(tag)))];

  if (!uniqueTags.length) {
    throw new Error("No supported cache tags were provided.");
  }

  await revalidateTagsWithAudit(uniqueTags, {
    ...auditContext,
    source: "manual-admin-refresh",
  });

  return uniqueTags;
}

export async function ensureProviderIsActive(providerCode) {
  const provider = await db.sourceProvider.findUnique({
    where: {
      code: providerCode,
    },
  });

  if (!provider || !provider.isActive) {
    throw new Error(`Provider ${providerCode} is currently disabled.`);
  }

  return provider;
}

export function getCoreDataRevalidationTags() {
  return [...COREUI_CACHE_TAGS];
}
