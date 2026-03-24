import { db } from "./db";
import { KNOWN_CACHE_TAGS } from "./cache-tags";

const ONE_MINUTE_MS = 1000 * 60;
const ONE_HOUR_MS = ONE_MINUTE_MS * 60;
const ONE_DAY_MS = ONE_HOUR_MS * 24;
const CACHE_EVENT_FLUSH_INTERVAL = 12;

const SLO_TARGETS = {
  routeLatencyP95Ms: 900,
  searchLatencyP95Ms: 700,
  cacheHitRate: 0.72,
  liveSyncLagMinutes: 10,
  staleLiveRate: 0.18,
  routeErrorsPerHour: 6,
};

function clampNumber(value, minimum, maximum, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(maximum, Math.max(minimum, parsed));
}

function pickString(value, fallback = null) {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : fallback;
}

function truncate(value, length = 191) {
  const normalized = pickString(value);
  if (!normalized) {
    return null;
  }

  return normalized.slice(0, length);
}

function normalizeStatus(value, fallback = "ok") {
  return truncate(value || fallback, 64) || fallback;
}

function toIso(value) {
  return value ? new Date(value).toISOString() : null;
}

function roundNumber(value, digits = 2) {
  if (!Number.isFinite(value)) {
    return null;
  }

  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function calculateAverage(values = []) {
  if (!values.length) {
    return null;
  }

  return roundNumber(values.reduce((total, value) => total + value, 0) / values.length, 1);
}

function percentile(values = [], ratio = 0.95) {
  if (!values.length) {
    return null;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.max(0, Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1));
  return sorted[index];
}

function summarizeStatuses(items = [], key = "status") {
  return items.reduce((accumulator, item) => {
    const value = item?.[key] || "unknown";
    accumulator[value] = (accumulator[value] || 0) + 1;
    return accumulator;
  }, {});
}

function getOperationalConfig() {
  return {
    enabled: (process.env.OPS_METRICS_ENABLED || "true") !== "false",
    sampleRate: clampNumber(process.env.OPS_METRICS_SAMPLE_RATE, 0.01, 1, 1),
    slowRouteMs: clampNumber(process.env.OPS_ROUTE_SLOW_MS, 100, 10000, 1200),
    searchSlowMs: clampNumber(process.env.OPS_SEARCH_SLOW_MS, 100, 5000, 750),
  };
}

function shouldSample(sampleRate) {
  return sampleRate >= 1 || Math.random() <= sampleRate;
}

function getCacheTelemetryStore() {
  if (!globalThis.__sportsCacheTelemetryStore) {
    globalThis.__sportsCacheTelemetryStore = new Map();
  }

  return globalThis.__sportsCacheTelemetryStore;
}

function getCacheEntry(tag) {
  const store = getCacheTelemetryStore();

  if (!store.has(tag)) {
    store.set(tag, {
      fillCount: 0,
      accessCount: 0,
      hitCount: 0,
      missCount: 0,
      lastFilledAt: null,
      lastObservedAt: null,
      lastPersistedAt: null,
      lastStatus: "unknown",
      context: {},
    });
  }

  return store.get(tag);
}

function serializeCacheTelemetryEntry(tag, entry) {
  const total = entry.hitCount + entry.missCount;
  const hitRate = total ? entry.hitCount / total : null;

  return {
    tag,
    accessCount: entry.accessCount,
    hitCount: entry.hitCount,
    missCount: entry.missCount,
    hitRate: roundNumber(hitRate, 4),
    fillCount: entry.fillCount,
    lastFilledAt: entry.lastFilledAt ? new Date(entry.lastFilledAt).toISOString() : null,
    lastObservedAt: entry.lastObservedAt ? new Date(entry.lastObservedAt).toISOString() : null,
    lastPersistedAt: entry.lastPersistedAt ? new Date(entry.lastPersistedAt).toISOString() : null,
    lastStatus: entry.lastStatus,
    context: entry.context || {},
  };
}

export function markCacheFill(tag, context = {}) {
  const entry = getCacheEntry(tag);
  entry.fillCount += 1;
  entry.lastFilledAt = Date.now();
  entry.context = {
    ...entry.context,
    ...(context && typeof context === "object" ? context : {}),
  };
}

export async function recordOperationalEvent(payload, { force = false } = {}) {
  const config = getOperationalConfig();
  if (!config.enabled) {
    return null;
  }

  if (!force && !shouldSample(config.sampleRate)) {
    return null;
  }

  const category = truncate(payload?.category, 64);
  const metric = truncate(payload?.metric, 64);

  if (!category || !metric) {
    return null;
  }

  try {
    return await db.operationalEvent.create({
      data: {
        category,
        metric,
        subject: truncate(payload?.subject),
        route: truncate(payload?.route),
        status: truncate(payload?.status, 64),
        durationMs:
          Number.isFinite(payload?.durationMs) && payload.durationMs >= 0
            ? Math.round(payload.durationMs)
            : null,
        value: Number.isFinite(payload?.value) ? Number(payload.value) : null,
        metadata:
          payload?.metadata && typeof payload.metadata === "object" ? payload.metadata : null,
      },
    });
  } catch (error) {
    return null;
  }
}

export async function observeOperation(context, task) {
  const startedAt = Date.now();

  try {
    const result = await task();
    const durationMs = Date.now() - startedAt;
    const status =
      typeof context?.statusFromResult === "function"
        ? normalizeStatus(context.statusFromResult(result))
        : durationMs >= getOperationalConfig().slowRouteMs
          ? "slow"
          : "ok";

    void recordOperationalEvent(
      {
        category: context?.category || "route_latency",
        metric: context?.metric || "server_read",
        subject: context?.subject || null,
        route: context?.route || null,
        status,
        durationMs,
        metadata:
          typeof context?.metadata === "function" ? context.metadata(result) : context?.metadata,
      },
      context?.eventOptions
    );

    return result;
  } catch (error) {
    void recordOperationalEvent(
      {
        category: context?.category || "route_latency",
        metric: context?.metric || "server_read",
        subject: context?.subject || null,
        route: context?.route || null,
        status: context?.failureStatus || "error",
        durationMs: Date.now() - startedAt,
        metadata: {
          ...(context?.metadataOnError || {}),
          error: error instanceof Error ? error.message : String(error),
        },
      },
      {
        force: true,
      }
    );

    throw error;
  }
}

export async function observeCachedOperation(tag, reader, context = {}) {
  const before = { ...getCacheEntry(tag) };

  try {
    const result = await reader();
    const entry = getCacheEntry(tag);
    const miss = !before.fillCount || entry.fillCount !== before.fillCount;

    entry.accessCount += 1;
    entry.lastObservedAt = Date.now();
    entry.lastStatus = miss ? "miss" : "hit";
    entry.context = {
      ...entry.context,
      ...(context && typeof context === "object" ? context : {}),
    };

    if (miss) {
      entry.missCount += 1;
    } else {
      entry.hitCount += 1;
    }

    const shouldPersist =
      miss ||
      !entry.lastPersistedAt ||
      entry.accessCount % CACHE_EVENT_FLUSH_INTERVAL === 0 ||
      Date.now() - entry.lastPersistedAt >= ONE_HOUR_MS;

    if (shouldPersist) {
      entry.lastPersistedAt = Date.now();
      const snapshot = serializeCacheTelemetryEntry(tag, entry);

      void recordOperationalEvent(
        {
          category: "cache_access",
          metric: "surface_cache",
          subject: tag,
          route: context?.route || null,
          status: miss ? "miss" : "hit",
          value: snapshot.hitRate,
          metadata: {
            ...snapshot,
            revalidateSeconds: context?.revalidateSeconds || null,
          },
        },
        {
          force: true,
        }
      );
    }

    return result;
  } catch (error) {
    void recordOperationalEvent(
      {
        category: "cache_access",
        metric: "surface_cache",
        subject: tag,
        route: context?.route || null,
        status: "error",
        metadata: {
          error: error instanceof Error ? error.message : String(error),
        },
      },
      {
        force: true,
      }
    );

    throw error;
  }
}

export function getInMemoryCacheTelemetry() {
  const store = getCacheTelemetryStore();
  return [...store.entries()]
    .map(([tag, entry]) => serializeCacheTelemetryEntry(tag, entry))
    .sort((left, right) => left.tag.localeCompare(right.tag));
}

export async function recordSyncPressureEvent(payload) {
  return recordOperationalEvent(
    {
      category: "sync_pressure",
      metric: payload?.metric || "live_window",
      subject: payload?.subject || "high-frequency",
      status: payload?.status || "nominal",
      value: Number.isFinite(payload?.value) ? payload.value : null,
      metadata: payload?.metadata || null,
    },
    {
      force: true,
    }
  );
}

export async function recordFailureDrillEvent(payload) {
  return recordOperationalEvent(
    {
      category: "failure_drill",
      metric: payload?.metric || "scenario",
      subject: payload?.subject || null,
      status: payload?.status || "completed",
      durationMs: payload?.durationMs || null,
      value: Number.isFinite(payload?.value) ? payload.value : null,
      metadata: payload?.metadata || null,
    },
    {
      force: true,
    }
  );
}

function summarizeLatencyEvents(events = []) {
  const durations = events.map((event) => event.durationMs).filter(Number.isFinite);

  return {
    total: events.length,
    statusCounts: summarizeStatuses(events),
    averageMs: calculateAverage(durations),
    p50Ms: percentile(durations, 0.5),
    p95Ms: percentile(durations, 0.95),
    slowCount: events.filter((event) => ["slow", "error"].includes(event.status)).length,
    topRoutes: [...events.reduce((accumulator, event) => {
      const route = event.route || event.subject || "unknown";

      if (!accumulator.has(route)) {
        accumulator.set(route, {
          route,
          count: 0,
          averageMs: 0,
          samples: [],
          lastSeenAt: event.createdAt,
        });
      }

      const entry = accumulator.get(route);
      entry.count += 1;
      entry.lastSeenAt =
        new Date(event.createdAt).getTime() > new Date(entry.lastSeenAt).getTime()
          ? event.createdAt
          : entry.lastSeenAt;

      if (Number.isFinite(event.durationMs)) {
        entry.samples.push(event.durationMs);
      }

      return accumulator;
    }, new Map()).values()]
      .map((entry) => ({
        route: entry.route,
        count: entry.count,
        averageMs: calculateAverage(entry.samples),
        p95Ms: percentile(entry.samples, 0.95),
        lastSeenAt: entry.lastSeenAt,
      }))
      .sort((left, right) => {
        if ((right.p95Ms || 0) !== (left.p95Ms || 0)) {
          return (right.p95Ms || 0) - (left.p95Ms || 0);
        }

        return right.count - left.count;
      })
      .slice(0, 8),
  };
}

function summarizeCacheEvents(events = []) {
  const tags = [...events.reduce((accumulator, event) => {
    const tag = event.subject || "unknown";
    const hit = event.status === "hit";
    const miss = event.status === "miss";

    if (!accumulator.has(tag)) {
      accumulator.set(tag, {
        tag,
        samples: 0,
        hits: 0,
        misses: 0,
        lastSeenAt: event.createdAt,
        latestHitRate: null,
      });
    }

    const entry = accumulator.get(tag);
    entry.samples += 1;
    entry.hits += hit ? 1 : 0;
    entry.misses += miss ? 1 : 0;
    entry.lastSeenAt =
      new Date(event.createdAt).getTime() > new Date(entry.lastSeenAt).getTime()
        ? event.createdAt
        : entry.lastSeenAt;
    entry.latestHitRate =
      Number.isFinite(event.value) ? Number(event.value) : entry.latestHitRate;

    return accumulator;
  }, new Map()).values()]
    .map((entry) => ({
      ...entry,
      hitRate:
        entry.latestHitRate ??
        (entry.hits + entry.misses ? roundNumber(entry.hits / (entry.hits + entry.misses), 4) : null),
    }))
    .sort((left, right) => {
      if ((left.hitRate ?? 0) !== (right.hitRate ?? 0)) {
        return (left.hitRate ?? 0) - (right.hitRate ?? 0);
      }

      return right.samples - left.samples;
    });

  return {
    totalSamples: events.length,
    hitRate: tags.length
      ? roundNumber(
          tags.reduce((total, entry) => total + (entry.hitRate || 0), 0) / tags.length,
          4
        )
      : null,
    byTag: tags.slice(0, 10),
  };
}

function summarizeSearchEvents(events = []) {
  const durations = events.map((event) => event.durationMs).filter(Number.isFinite);
  const degraded = events.filter((event) => event.status === "degraded").length;
  const errors = events.filter((event) => event.status === "error").length;
  const zeroResult = events.filter(
    (event) => event.metadata && Number(event.metadata.totalResults || 0) === 0
  ).length;

  return {
    total: events.length,
    averageMs: calculateAverage(durations),
    p95Ms: percentile(durations, 0.95),
    degradedCount: degraded,
    errorCount: errors,
    zeroResultCount: zeroResult,
    successRate: events.length
      ? roundNumber((events.length - errors) / events.length, 4)
      : null,
  };
}

function summarizePressureEvents(events = []) {
  const latest = events[0] || null;

  return {
    total: events.length,
    statusCounts: summarizeStatuses(events),
    latest: latest
      ? {
          status: latest.status,
          createdAt: latest.createdAt,
          subject: latest.subject,
          metadata: latest.metadata,
        }
      : null,
  };
}

function buildSloResults({
  latency,
  search,
  cache,
  routeErrorsLastHour,
  syncLagMinutes,
  staleLiveRate,
}) {
  return [
    {
      key: "live-read-p95",
      label: "Live surface read latency p95",
      target: `< ${SLO_TARGETS.routeLatencyP95Ms}ms`,
      currentValue: latency.p95Ms,
      status:
        latency.p95Ms == null
          ? "unknown"
          : latency.p95Ms <= SLO_TARGETS.routeLatencyP95Ms
            ? "healthy"
            : "attention",
    },
    {
      key: "search-p95",
      label: "Search latency p95",
      target: `< ${SLO_TARGETS.searchLatencyP95Ms}ms`,
      currentValue: search.p95Ms,
      status:
        search.p95Ms == null
          ? "unknown"
          : search.p95Ms <= SLO_TARGETS.searchLatencyP95Ms
            ? "healthy"
            : "attention",
    },
    {
      key: "cache-hit-rate",
      label: "Cache hit rate",
      target: `>= ${Math.round(SLO_TARGETS.cacheHitRate * 100)}%`,
      currentValue: cache.hitRate == null ? null : roundNumber(cache.hitRate * 100, 1),
      status:
        cache.hitRate == null
          ? "unknown"
          : cache.hitRate >= SLO_TARGETS.cacheHitRate
            ? "healthy"
            : "attention",
    },
    {
      key: "live-sync-lag",
      label: "Live sync lag",
      target: `<= ${SLO_TARGETS.liveSyncLagMinutes} min`,
      currentValue: syncLagMinutes,
      status:
        syncLagMinutes == null
          ? "unknown"
          : syncLagMinutes <= SLO_TARGETS.liveSyncLagMinutes
            ? "healthy"
            : "attention",
    },
    {
      key: "stale-live-rate",
      label: "Stale live data rate",
      target: `<= ${Math.round(SLO_TARGETS.staleLiveRate * 100)}%`,
      currentValue: staleLiveRate == null ? null : roundNumber(staleLiveRate * 100, 1),
      status:
        staleLiveRate == null
          ? "unknown"
          : staleLiveRate <= SLO_TARGETS.staleLiveRate
            ? "healthy"
            : "attention",
    },
    {
      key: "route-errors-hour",
      label: "Route errors per hour",
      target: `<= ${SLO_TARGETS.routeErrorsPerHour}`,
      currentValue: routeErrorsLastHour,
      status:
        routeErrorsLastHour <= SLO_TARGETS.routeErrorsPerHour ? "healthy" : "attention",
    },
  ];
}

function buildStaleLiveRate(totalLiveFixtures, staleLiveFixtures) {
  if (!totalLiveFixtures) {
    return null;
  }

  return staleLiveFixtures / totalLiveFixtures;
}

function buildProviderCoverageRows(providers = []) {
  return providers.map((provider) => ({
    code: provider.code,
    name: provider.name,
    kind: provider.kind,
    isActive: provider.isActive,
    updatedAt: provider.updatedAt,
    stage: provider.metadata?.stage || provider.metadata?.tier || null,
    sports:
      Array.isArray(provider.metadata?.sports) && provider.metadata.sports.length
        ? provider.metadata.sports
        : [],
    role: provider.metadata?.role || null,
    fallbackFor:
      Array.isArray(provider.metadata?.fallbackFor) && provider.metadata.fallbackFor.length
        ? provider.metadata.fallbackFor
        : [],
  }));
}

export async function getOperationalDashboardSnapshot() {
  const since = new Date(Date.now() - ONE_DAY_MS);
  const hourWindow = new Date(Date.now() - ONE_HOUR_MS);

  const [
    events,
    routeErrorCountLastHour,
    liveFixtureCount,
    staleLiveFixtureCount,
    liveCheckpoint,
    providers,
  ] = await Promise.all([
    db.operationalEvent.findMany({
      where: {
        createdAt: {
          gte: since,
        },
      },
      orderBy: [{ createdAt: "desc" }],
      take: 500,
    }),
    db.routeErrorEvent.count({
      where: {
        createdAt: {
          gte: hourWindow,
        },
      },
    }),
    db.fixture.count({
      where: {
        status: "LIVE",
      },
    }),
    db.fixture.count({
      where: {
        status: "LIVE",
        OR: [
          { lastSyncedAt: null },
          {
            lastSyncedAt: {
              lt: new Date(Date.now() - ONE_MINUTE_MS * 8),
            },
          },
        ],
      },
    }),
    db.syncCheckpoint.findFirst({
      where: {
        key: "fixtures:live",
      },
      orderBy: [{ updatedAt: "desc" }],
      select: {
        updatedAt: true,
        lastSuccessAt: true,
        provider: true,
        payload: true,
      },
    }),
    db.sourceProvider.findMany({
      orderBy: [{ code: "asc" }],
    }),
  ]);

  const latencyEvents = events.filter((event) => event.category === "route_latency");
  const cacheEvents = events.filter((event) => event.category === "cache_access");
  const searchEvents = events.filter((event) => event.category === "search_health");
  const pressureEvents = events.filter((event) => event.category === "sync_pressure");
  const drillEvents = events.filter((event) => event.category === "failure_drill");
  const staleLiveRate = buildStaleLiveRate(liveFixtureCount, staleLiveFixtureCount);
  const syncLagMinutes = liveCheckpoint?.lastSuccessAt
    ? Math.max(
        0,
        Math.round((Date.now() - new Date(liveCheckpoint.lastSuccessAt).getTime()) / ONE_MINUTE_MS)
      )
    : null;

  const latency = summarizeLatencyEvents(latencyEvents);
  const cache = summarizeCacheEvents(cacheEvents);
  const search = summarizeSearchEvents(searchEvents);
  const pressure = summarizePressureEvents(pressureEvents);
  const slos = buildSloResults({
    latency,
    search,
    cache,
    routeErrorsLastHour: routeErrorCountLastHour,
    syncLagMinutes,
    staleLiveRate,
  });

  return {
    latency,
    cache,
    search,
    pressure,
    drills: {
      recent: drillEvents.slice(0, 12),
      statusCounts: summarizeStatuses(drillEvents),
    },
    providers: buildProviderCoverageRows(providers),
    liveData: {
      liveFixtureCount,
      staleLiveFixtureCount,
      staleLiveRate,
      latestLiveCheckpointAt: toIso(liveCheckpoint?.lastSuccessAt || liveCheckpoint?.updatedAt),
      provider: liveCheckpoint?.provider || null,
    },
    slos,
    summary: {
      routeErrorsLastHour: routeErrorCountLastHour,
      knownCacheTags: KNOWN_CACHE_TAGS.length,
      cacheTagsObserved: cache.byTag.length,
      activeProviders: providers.filter((provider) => provider.isActive).length,
      drillRunsLast24Hours: drillEvents.length,
    },
    inMemoryCache: getInMemoryCacheTelemetry(),
  };
}

async function runProviderOutageDrill() {
  const providers = await db.sourceProvider.findMany({
    orderBy: [{ code: "asc" }],
  });

  const activePrimary = providers.find(
    (provider) => provider.isActive && provider.metadata?.role === "primary"
  );
  const activeFallbacks = providers.filter(
    (provider) =>
      provider.isActive &&
      provider.metadata?.role === "backup" &&
      Array.isArray(provider.metadata?.fallbackFor) &&
      provider.metadata.fallbackFor.length
  );
  const status = activePrimary && activeFallbacks.length ? "ready" : "attention";

  const result = {
    scenario: "provider_outage",
    status,
    summary: activePrimary
      ? `${activePrimary.code} has ${activeFallbacks.length} active fallback path(s).`
      : "No active primary provider is marked for outage handling.",
    checks: [
      {
        label: "Primary provider declared",
        status: activePrimary ? "pass" : "fail",
      },
      {
        label: "Backup providers active",
        status: activeFallbacks.length ? "pass" : "fail",
      },
    ],
    providers: buildProviderCoverageRows(providers),
  };

  await recordFailureDrillEvent({
    metric: "provider_outage",
    subject: activePrimary?.code || "providers",
    status,
    metadata: result,
  });

  return result;
}

async function runDelayedLiveFeedDrill() {
  const [liveCount, staleCount, checkpoint] = await Promise.all([
    db.fixture.count({
      where: { status: "LIVE" },
    }),
    db.fixture.count({
      where: {
        status: "LIVE",
        OR: [
          { lastSyncedAt: null },
          {
            lastSyncedAt: {
              lt: new Date(Date.now() - ONE_MINUTE_MS * 8),
            },
          },
        ],
      },
    }),
    db.syncCheckpoint.findFirst({
      where: {
        key: "fixtures:live",
      },
      orderBy: [{ updatedAt: "desc" }],
    }),
  ]);

  const lagMinutes = checkpoint?.lastSuccessAt
    ? Math.round((Date.now() - new Date(checkpoint.lastSuccessAt).getTime()) / ONE_MINUTE_MS)
    : null;
  const staleRate = buildStaleLiveRate(liveCount, staleCount);
  const status =
    (lagMinutes != null && lagMinutes <= SLO_TARGETS.liveSyncLagMinutes) &&
    (staleRate == null || staleRate <= SLO_TARGETS.staleLiveRate)
      ? "ready"
      : "attention";

  const result = {
    scenario: "delayed_live_feed",
    status,
    liveCount,
    staleCount,
    lagMinutes,
    staleRate,
    summary:
      staleCount || (lagMinutes != null && lagMinutes > SLO_TARGETS.liveSyncLagMinutes)
        ? "Live feed delay indicators are present. Follow the stale-data playbook."
        : "Live feed is within the current stale-data budget.",
  };

  await recordFailureDrillEvent({
    metric: "delayed_live_feed",
    subject: checkpoint?.provider || "fixtures:live",
    status,
    value: staleRate,
    metadata: result,
  });

  return result;
}

async function runSearchDegradationDrill() {
  const since = new Date(Date.now() - ONE_DAY_MS);
  const events = await db.operationalEvent.findMany({
    where: {
      category: "search_health",
      createdAt: {
        gte: since,
      },
    },
    orderBy: [{ createdAt: "desc" }],
    take: 120,
  });

  const search = summarizeSearchEvents(events);
  const status =
    (search.errorCount || 0) === 0 &&
    (search.degradedCount || 0) === 0 &&
    (search.p95Ms == null || search.p95Ms <= SLO_TARGETS.searchLatencyP95Ms)
      ? "ready"
      : "attention";

  const result = {
    scenario: "search_degradation",
    status,
    ...search,
    summary:
      status === "ready"
        ? "Search telemetry is within the latency and degradation budget."
        : "Search degradation risk detected. Review provider health, DB pressure, and fallback messaging.",
  };

  await recordFailureDrillEvent({
    metric: "search_degradation",
    subject: "global_search",
    status,
    value: search.p95Ms,
    metadata: result,
  });

  return result;
}

async function runCacheInvalidationDrill() {
  const since = new Date(Date.now() - ONE_DAY_MS);
  const [cacheEvents, cacheAudits] = await Promise.all([
    db.operationalEvent.findMany({
      where: {
        category: "cache_access",
        createdAt: {
          gte: since,
        },
      },
      orderBy: [{ createdAt: "desc" }],
      take: 150,
    }),
    db.auditLog.findMany({
      where: {
        entityType: "CacheTag",
        entityId: {
          in: KNOWN_CACHE_TAGS,
        },
        createdAt: {
          gte: since,
        },
      },
      orderBy: [{ createdAt: "desc" }],
      take: 150,
    }),
  ]);

  const cache = summarizeCacheEvents(cacheEvents);
  const tagsWithoutRecentRevalidation = KNOWN_CACHE_TAGS.filter(
    (tag) => !cacheAudits.some((entry) => entry.entityId === tag)
  );
  const status =
    (cache.hitRate == null || cache.hitRate >= SLO_TARGETS.cacheHitRate) &&
    !tagsWithoutRecentRevalidation.length
      ? "ready"
      : "attention";

  const result = {
    scenario: "cache_invalidation_issue",
    status,
    hitRate: cache.hitRate,
    tagsWithoutRecentRevalidation,
    summary:
      status === "ready"
        ? "Cache activity and revalidation coverage look healthy."
        : "Cache invalidation coverage is incomplete. Review the listed tags and recent refresh flow.",
  };

  await recordFailureDrillEvent({
    metric: "cache_invalidation_issue",
    subject: "cache",
    status,
    value: cache.hitRate,
    metadata: result,
  });

  return result;
}

export async function runFailureDrill(scenario) {
  switch (scenario) {
    case "provider_outage":
      return runProviderOutageDrill();
    case "delayed_live_feed":
      return runDelayedLiveFeedDrill();
    case "search_degradation":
      return runSearchDegradationDrill();
    case "cache_invalidation_issue":
      return runCacheInvalidationDrill();
    default:
      throw new Error("Unsupported drill scenario.");
  }
}

export function getOperationalSloTargets() {
  return { ...SLO_TARGETS };
}
