import { getSportsSyncConfig } from "../sports/config";
import { ensureProviderIsActive } from "../control-plane";
import { db } from "../db";
import { recordSyncPressureEvent } from "../operations";
import { createSportsProvider, getProviderChain, getProviderDescriptor } from "../sports/provider";
import {
  persistFixtureBatch,
  persistOddsBatch,
  persistStandingsBatch,
  persistTeamBatch,
  replaceBroadcastChannels,
} from "../sports/repository";
import { buildLiveWindowBackpressurePlan } from "./backpressure";
import {
  completeSyncJob,
  failSyncJob,
  getCheckpoint,
  saveCheckpoint,
  startSyncJob,
} from "./service";

function addDays(date, amount) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + amount);
  return next;
}

async function runTaxonomySnapshot(provider, syncJobId, config) {
  const taxonomy = await provider.fetchTaxonomy({
    leagueCodes: config.trackedLeagueCodes,
  });

  await saveCheckpoint({
    provider: config.provider,
    key: "taxonomy:snapshot",
    syncJobId,
    cursor: new Date().toISOString(),
    payload: {
      leagueCodes: config.trackedLeagueCodes,
      records: Array.isArray(taxonomy) ? taxonomy.length : 0,
    },
    success: true,
  });

  return Array.isArray(taxonomy) ? taxonomy.length : 0;
}

function addHours(date, amount) {
  const next = new Date(date);
  next.setUTCHours(next.getUTCHours() + amount);
  return next;
}

async function getHighFrequencyFixturePlan(config) {
  const now = new Date();
  const fixtures = await db.fixture.findMany({
    where: {
      externalRef: { not: null },
      OR: [
        { status: "LIVE" },
        {
          startsAt: {
            gte: addHours(now, -6),
            lte: addHours(now, 3),
          },
        },
      ],
    },
    orderBy: [{ startsAt: "asc" }],
    take: 80,
    select: {
      id: true,
      externalRef: true,
      status: true,
      startsAt: true,
      lastSyncedAt: true,
    },
  });
  const plan = buildLiveWindowBackpressurePlan(fixtures, config);

  await recordSyncPressureEvent({
    subject: "high-frequency",
    status: plan.underPressure ? "throttled" : "nominal",
    value: plan.summary.liveFixtures,
    metadata: plan.summary,
  });

  return plan;
}

async function runTrackedSeasonJobs(provider, seasonRefs, syncJobId, config) {
  let recordsProcessed = 0;

  for (const seasonExternalRef of seasonRefs) {
    const teams = await provider.fetchTeams({ seasonExternalRef });
    recordsProcessed += await persistTeamBatch(teams, seasonExternalRef);

    const standings = await provider.fetchStandings({ seasonExternalRef });
    recordsProcessed += await persistStandingsBatch(standings);

    await saveCheckpoint({
      provider: config.provider,
      key: `season:${seasonExternalRef}`,
      syncJobId,
      cursor: seasonExternalRef,
      payload: {
        teams: teams.length,
        standings: standings.length,
      },
      success: true,
    });
  }

  return recordsProcessed;
}

async function runFixturesWindow(provider, syncJobId, config) {
  const checkpoint = await getCheckpoint(config.provider, "fixtures:window");
  const now = new Date();
  const startDate = addDays(now, -config.fixtureDaysPast);
  const endDate = addDays(now, config.fixtureDaysAhead);
  const fixtures = await provider.fetchFixtures({ startDate, endDate });
  const recordsProcessed = await persistFixtureBatch(fixtures);

  await saveCheckpoint({
    provider: config.provider,
    key: "fixtures:window",
    syncJobId,
    cursor: checkpoint?.cursor || endDate.toISOString(),
    payload: {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      fixtures: fixtures.length,
    },
    success: true,
  });

  return recordsProcessed;
}

async function runLivescores(provider, syncJobId, config) {
  const fixtures = await provider.fetchLivescores();
  const recordsProcessed = await persistFixtureBatch(fixtures);

  await saveCheckpoint({
    provider: config.provider,
    key: "fixtures:live",
    syncJobId,
    cursor: new Date().toISOString(),
    payload: { fixtures: fixtures.length },
    success: true,
  });

  return recordsProcessed;
}

async function runActiveFixtureDetails(provider, syncJobId, config, fixturePlan) {
  const now = new Date();
  const fixtureRefs = (fixturePlan?.detailFixtures || [])
    .map((fixture) => fixture.externalRef)
    .filter(Boolean);

  let recordsProcessed = 0;

  for (const fixtureExternalRef of fixtureRefs) {
    const fixture = await provider.fetchFixtureDetail({ fixtureExternalRef });
    if (!fixture) {
      continue;
    }

    recordsProcessed += await persistFixtureBatch([fixture]);
  }

  await saveCheckpoint({
    provider: config.provider,
    key: "fixtures:active-detail",
    syncJobId,
    cursor: now.toISOString(),
    payload: {
      fixtures: fixtureRefs.length,
      hydrated: recordsProcessed,
      pressureMode: fixturePlan?.mode || "nominal",
      budget: fixturePlan?.summary?.detailBudget || fixtureRefs.length,
    },
    success: true,
  });

  return recordsProcessed;
}

async function runOdds(provider, syncJobId, config, fixturePlan) {
  if (!config.oddsEnabled) {
    return 0;
  }

  const fixtureRefs = config.trackedFixtureRefs.length
    ? config.trackedFixtureRefs
    : (fixturePlan?.oddsFixtures || [])
        .map((fixture) => fixture.externalRef)
        .filter(Boolean);

  let recordsProcessed = 0;

  for (const fixtureExternalRef of fixtureRefs) {
    const odds = await provider.fetchOdds({
      fixtureExternalRef,
      bookmakerIds: config.oddsBookmakers,
    });
    recordsProcessed += await persistOddsBatch(odds);

    await saveCheckpoint({
      provider: config.provider,
      key: `odds:${fixtureExternalRef}`,
      syncJobId,
      cursor: fixtureExternalRef,
      payload: { markets: odds.length },
      success: true,
    });
  }

  return recordsProcessed;
}

async function runBroadcasts(provider, syncJobId, config, fixturePlan) {
  if (!config.broadcastEnabled) {
    return 0;
  }

  const fixtureRefs = (fixturePlan?.broadcastFixtures || [])
    .map((fixture) => fixture.externalRef)
    .filter(Boolean);

  let recordsProcessed = 0;

  for (const fixtureExternalRef of fixtureRefs) {
    const channels = await provider.fetchMediaMetadata({
      fixtureExternalRef,
    });
    recordsProcessed += await replaceBroadcastChannels(fixtureExternalRef, channels);

    await saveCheckpoint({
      provider: config.provider,
      key: `broadcast:${fixtureExternalRef}`,
      syncJobId,
      cursor: fixtureExternalRef,
      payload: { channels: channels.length },
      success: true,
    });
  }

  return recordsProcessed;
}

export const syncJobRegistry = {
  "static-ish": {
    bucket: "static-ish",
    async run(provider, syncJobId, config) {
      let recordsProcessed = 0;
      recordsProcessed += await runTaxonomySnapshot(provider, syncJobId, config);
      recordsProcessed += await runFixturesWindow(provider, syncJobId, config);
      recordsProcessed += await runTrackedSeasonJobs(provider, config.trackedSeasonRefs, syncJobId, config);
      return recordsProcessed;
    },
  },
  daily: {
    bucket: "daily",
    async run(provider, syncJobId, config) {
      let recordsProcessed = 0;
      recordsProcessed += await runTaxonomySnapshot(provider, syncJobId, config);
      recordsProcessed += await runFixturesWindow(provider, syncJobId, config);
      recordsProcessed += await runTrackedSeasonJobs(provider, config.trackedSeasonRefs, syncJobId, config);
      return recordsProcessed;
    },
  },
  "high-frequency": {
    bucket: "high-frequency",
    async run(provider, syncJobId, config) {
      const fixturePlan = await getHighFrequencyFixturePlan(config);
      let recordsProcessed = 0;
      recordsProcessed += await runLivescores(provider, syncJobId, config);
      recordsProcessed += await runActiveFixtureDetails(provider, syncJobId, config, fixturePlan);
      recordsProcessed += await runOdds(provider, syncJobId, config, fixturePlan);
      recordsProcessed += await runBroadcasts(provider, syncJobId, config, fixturePlan);
      return recordsProcessed;
    },
  },
};

export async function runSyncJob(jobName) {
  const config = getSportsSyncConfig();
  const jobDefinition = syncJobRegistry[jobName];
  const providerDescriptor = getProviderDescriptor(config.provider);

  if (!jobDefinition) {
    throw new Error(`Unknown sync job: ${jobName}`);
  }

  if (!providerDescriptor) {
    throw new Error(`Unsupported sports provider: ${config.provider}`);
  }

  if (!providerDescriptor.implemented) {
    throw new Error(
      `Provider ${config.provider} is cataloged for env-driven switching, but adapter family ${providerDescriptor.adapter} is not implemented yet.`
    );
  }

  await ensureProviderIsActive(config.provider);
  const provider = createSportsProvider();
  const job = await startSyncJob({
    provider: config.provider,
    source: jobName,
    bucket: jobDefinition.bucket,
  });

  try {
    const recordsProcessed = await jobDefinition.run(provider, job.id, config);
    const summary = {
      recordsProcessed,
      resultSummary: {
        job: jobName,
        completedAt: new Date().toISOString(),
        providerChain: getProviderChain(config.provider, config.fallbackProviders),
      },
    };
    await completeSyncJob(job.id, summary);
    return { jobId: job.id, ...summary };
  } catch (error) {
    await saveCheckpoint({
      provider: config.provider,
      key: `job:${jobName}`,
      syncJobId: job.id,
      cursor: new Date().toISOString(),
      payload: null,
      errorMessage: error instanceof Error ? error.message : String(error),
      success: false,
    });
    await failSyncJob(job.id, error);
    throw error;
  }
}
