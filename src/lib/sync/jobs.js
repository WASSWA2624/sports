import { getSportsSyncConfig } from "../sports/config";
import { ensureProviderIsActive } from "../control-plane";
import { db } from "../db";
import { recordSyncPressureEvent } from "../operations";
import { createSportsProvider, getProviderChain, getProviderDescriptor } from "../sports/provider";
import {
  persistFixtureBatch,
  persistOddsBatch,
  persistPredictionBatch,
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

function formatSyncError(error) {
  return error instanceof Error ? error.message : String(error);
}

function truncateFailures(failures = [], limit = 8) {
  return failures.slice(0, limit);
}

function buildStepResult(step, options = {}) {
  return {
    step,
    recordsProcessed: options.recordsProcessed || 0,
    attempted: options.attempted || 0,
    failureCount: options.failureCount || 0,
    failures: truncateFailures(options.failures || []),
    metadata: options.metadata || null,
  };
}

function getCheckpointOutcome({ attempted = 0, recordsProcessed = 0, failureCount = 0 } = {}) {
  return {
    markSuccess: attempted === 0 || failureCount < attempted || recordsProcessed > 0,
    markFailure: failureCount > 0,
  };
}

function summarizeJobSteps(jobName, steps, config) {
  const recordsProcessed = steps.reduce(
    (total, step) => total + (step?.recordsProcessed || 0),
    0
  );
  const failureCount = steps.reduce((total, step) => total + (step?.failureCount || 0), 0);

  return {
    recordsProcessed,
    failureCount,
    resultSummary: {
      job: jobName,
      completedAt: new Date().toISOString(),
      providerChain: getProviderChain(config.provider, config.fallbackProviders),
      steps,
    },
  };
}

async function runTaxonomySnapshot(provider, syncJobId, config) {
  const taxonomy = await provider.fetchTaxonomy({
    leagueCodes: config.trackedLeagueCodes,
  });
  const recordsProcessed = Array.isArray(taxonomy) ? taxonomy.length : 0;

  await saveCheckpoint({
    provider: config.provider,
    key: "taxonomy:snapshot",
    syncJobId,
    cursor: new Date().toISOString(),
    payload: {
      leagueCodes: config.trackedLeagueCodes,
      records: recordsProcessed,
    },
    success: true,
  });

  return buildStepResult("taxonomy", {
    recordsProcessed,
    attempted: config.trackedLeagueCodes.length,
    metadata: {
      trackedLeagueCodes: config.trackedLeagueCodes,
    },
  });
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

async function getCatalogFixtureRefs(config) {
  if (config.trackedFixtureRefs.length) {
    return config.trackedFixtureRefs;
  }

  const now = new Date();
  const fixtures = await db.fixture.findMany({
    where: {
      externalRef: { not: null },
      OR: [
        { status: "LIVE" },
        {
          startsAt: {
            gte: addDays(now, -1),
            lte: addDays(now, config.fixtureDaysAhead),
          },
        },
      ],
    },
    orderBy: [{ startsAt: "asc" }],
    take: config.bookmakerCatalogFixtureLimit,
    select: {
      externalRef: true,
    },
  });

  return [...new Set(fixtures.map((fixture) => fixture.externalRef).filter(Boolean))];
}

async function runTrackedSeasonJobs(provider, seasonRefs, syncJobId, config) {
  let recordsProcessed = 0;
  const failures = [];

  for (const seasonExternalRef of seasonRefs) {
    try {
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
    } catch (error) {
      failures.push({
        seasonExternalRef,
        error: formatSyncError(error),
      });
      await saveCheckpoint({
        provider: config.provider,
        key: `season:${seasonExternalRef}`,
        syncJobId,
        cursor: seasonExternalRef,
        payload: {
          seasonExternalRef,
        },
        errorMessage: formatSyncError(error),
        success: false,
      });
    }
  }

  const outcome = getCheckpointOutcome({
    attempted: seasonRefs.length,
    recordsProcessed,
    failureCount: failures.length,
  });
  await saveCheckpoint({
    provider: config.provider,
    key: "season:tracked",
    syncJobId,
    cursor: new Date().toISOString(),
    payload: {
      seasonRefs,
      recordsProcessed,
      failureCount: failures.length,
      failures: truncateFailures(failures),
    },
    errorMessage: failures[0]?.error || null,
    markSuccess: outcome.markSuccess,
    markFailure: outcome.markFailure,
  });

  return buildStepResult("tracked-seasons", {
    recordsProcessed,
    attempted: seasonRefs.length,
    failureCount: failures.length,
    failures,
    metadata: {
      seasonRefs,
    },
  });
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

  return buildStepResult("fixtures-window", {
    recordsProcessed,
    attempted: fixtures.length,
    metadata: {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    },
  });
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

  return buildStepResult("livescores", {
    recordsProcessed,
    attempted: fixtures.length,
  });
}

async function runActiveFixtureDetails(provider, syncJobId, config, fixturePlan) {
  const now = new Date();
  const fixtureRefs = (fixturePlan?.detailFixtures || [])
    .map((fixture) => fixture.externalRef)
    .filter(Boolean);

  let recordsProcessed = 0;
  const failures = [];

  for (const fixtureExternalRef of fixtureRefs) {
    try {
      const fixture = await provider.fetchFixtureDetail({ fixtureExternalRef });
      if (!fixture) {
        continue;
      }

      recordsProcessed += await persistFixtureBatch([fixture]);
    } catch (error) {
      failures.push({
        fixtureExternalRef,
        error: formatSyncError(error),
      });
      await saveCheckpoint({
        provider: config.provider,
        key: `fixture-detail:${fixtureExternalRef}`,
        syncJobId,
        cursor: fixtureExternalRef,
        payload: {
          fixtureExternalRef,
        },
        errorMessage: formatSyncError(error),
        success: false,
      });
    }
  }

  const outcome = getCheckpointOutcome({
    attempted: fixtureRefs.length,
    recordsProcessed,
    failureCount: failures.length,
  });

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
      failureCount: failures.length,
      failures: truncateFailures(failures),
    },
    errorMessage: failures[0]?.error || null,
    markSuccess: outcome.markSuccess,
    markFailure: outcome.markFailure,
  });

  return buildStepResult("active-fixture-detail", {
    recordsProcessed,
    attempted: fixtureRefs.length,
    failureCount: failures.length,
    failures,
    metadata: {
      pressureMode: fixturePlan?.mode || "nominal",
      budget: fixturePlan?.summary?.detailBudget || fixtureRefs.length,
    },
  });
}

async function runOdds(provider, syncJobId, config, fixturePlan) {
  if (!config.oddsEnabled) {
    return buildStepResult("odds", {
      metadata: {
        enabled: false,
      },
    });
  }

  const fixtureRefs = config.trackedFixtureRefs.length
    ? config.trackedFixtureRefs
    : (fixturePlan?.oddsFixtures || [])
        .map((fixture) => fixture.externalRef)
        .filter(Boolean);

  let recordsProcessed = 0;
  const failures = [];

  for (const fixtureExternalRef of fixtureRefs) {
    try {
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
    } catch (error) {
      failures.push({
        fixtureExternalRef,
        error: formatSyncError(error),
      });
      await saveCheckpoint({
        provider: config.provider,
        key: `odds:${fixtureExternalRef}`,
        syncJobId,
        cursor: fixtureExternalRef,
        payload: { fixtureExternalRef },
        errorMessage: formatSyncError(error),
        success: false,
      });
    }
  }

  return buildStepResult("odds", {
    recordsProcessed,
    attempted: fixtureRefs.length,
    failureCount: failures.length,
    failures,
    metadata: {
      bookmakerIds: config.oddsBookmakers,
    },
  });
}

async function runBroadcasts(provider, syncJobId, config, fixturePlan) {
  if (!config.broadcastEnabled) {
    return buildStepResult("broadcasts", {
      metadata: {
        enabled: false,
      },
    });
  }

  const fixtureRefs = (fixturePlan?.broadcastFixtures || [])
    .map((fixture) => fixture.externalRef)
    .filter(Boolean);

  let recordsProcessed = 0;
  const failures = [];

  for (const fixtureExternalRef of fixtureRefs) {
    try {
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
    } catch (error) {
      failures.push({
        fixtureExternalRef,
        error: formatSyncError(error),
      });
      await saveCheckpoint({
        provider: config.provider,
        key: `broadcast:${fixtureExternalRef}`,
        syncJobId,
        cursor: fixtureExternalRef,
        payload: { fixtureExternalRef },
        errorMessage: formatSyncError(error),
        success: false,
      });
    }
  }

  return buildStepResult("broadcasts", {
    recordsProcessed,
    attempted: fixtureRefs.length,
    failureCount: failures.length,
    failures,
  });
}

async function runBookmakerCatalog(provider, syncJobId, config) {
  if (!config.oddsEnabled) {
    return buildStepResult("bookmaker-catalog", {
      metadata: {
        enabled: false,
      },
    });
  }

  const fixtureRefs = await getCatalogFixtureRefs(config);
  let recordsProcessed = 0;
  const failures = [];

  for (const fixtureExternalRef of fixtureRefs) {
    try {
      const odds = await provider.fetchOdds({
        fixtureExternalRef,
        bookmakerIds: config.oddsBookmakers,
      });
      recordsProcessed += await persistOddsBatch(odds);
    } catch (error) {
      failures.push({
        fixtureExternalRef,
        error: formatSyncError(error),
      });
    }
  }

  const outcome = getCheckpointOutcome({
    attempted: fixtureRefs.length,
    recordsProcessed,
    failureCount: failures.length,
  });
  await saveCheckpoint({
    provider: config.provider,
    key: "bookmakers:catalog",
    syncJobId,
    cursor: new Date().toISOString(),
    payload: {
      fixtureRefs,
      recordsProcessed,
      failureCount: failures.length,
      failures: truncateFailures(failures),
    },
    errorMessage: failures[0]?.error || null,
    markSuccess: outcome.markSuccess,
    markFailure: outcome.markFailure,
  });

  return buildStepResult("bookmaker-catalog", {
    recordsProcessed,
    attempted: fixtureRefs.length,
    failureCount: failures.length,
    failures,
  });
}

async function runPredictions(provider, syncJobId, config) {
  if (!config.predictionsEnabled) {
    return buildStepResult("predictions", {
      metadata: {
        enabled: false,
      },
    });
  }

  const fixtureRefs = (await getCatalogFixtureRefs(config)).slice(0, config.maxPredictionFixturesPerRun);
  let recordsProcessed = 0;
  const failures = [];

  for (const fixtureExternalRef of fixtureRefs) {
    try {
      const predictions = await provider.fetchPredictions({ fixtureExternalRef });
      recordsProcessed += await persistPredictionBatch(predictions);

      await saveCheckpoint({
        provider: config.provider,
        key: `predictions:${fixtureExternalRef}`,
        syncJobId,
        cursor: fixtureExternalRef,
        payload: {
          predictions: Array.isArray(predictions) ? predictions.length : 0,
        },
        success: true,
      });
    } catch (error) {
      failures.push({
        fixtureExternalRef,
        error: formatSyncError(error),
      });
      await saveCheckpoint({
        provider: config.provider,
        key: `predictions:${fixtureExternalRef}`,
        syncJobId,
        cursor: fixtureExternalRef,
        payload: {
          fixtureExternalRef,
        },
        errorMessage: formatSyncError(error),
        success: false,
      });
    }
  }

  const outcome = getCheckpointOutcome({
    attempted: fixtureRefs.length,
    recordsProcessed,
    failureCount: failures.length,
  });
  await saveCheckpoint({
    provider: config.provider,
    key: "predictions:catalog",
    syncJobId,
    cursor: new Date().toISOString(),
    payload: {
      fixtureRefs,
      recordsProcessed,
      failureCount: failures.length,
      failures: truncateFailures(failures),
    },
    errorMessage: failures[0]?.error || null,
    markSuccess: outcome.markSuccess,
    markFailure: outcome.markFailure,
  });

  return buildStepResult("predictions", {
    recordsProcessed,
    attempted: fixtureRefs.length,
    failureCount: failures.length,
    failures,
  });
}

export const syncJobRegistry = {
  "static-ish": {
    bucket: "static-ish",
    async run(provider, syncJobId, config) {
      const steps = [
        await runTaxonomySnapshot(provider, syncJobId, config),
        await runFixturesWindow(provider, syncJobId, config),
        await runTrackedSeasonJobs(provider, config.trackedSeasonRefs, syncJobId, config),
      ];
      return summarizeJobSteps("static-ish", steps, config);
    },
  },
  daily: {
    bucket: "daily",
    async run(provider, syncJobId, config) {
      const steps = [
        await runTaxonomySnapshot(provider, syncJobId, config),
        await runFixturesWindow(provider, syncJobId, config),
        await runTrackedSeasonJobs(provider, config.trackedSeasonRefs, syncJobId, config),
      ];
      return summarizeJobSteps("daily", steps, config);
    },
  },
  "high-frequency": {
    bucket: "high-frequency",
    async run(provider, syncJobId, config) {
      const fixturePlan = await getHighFrequencyFixturePlan(config);
      const steps = [
        await runLivescores(provider, syncJobId, config),
        await runActiveFixtureDetails(provider, syncJobId, config, fixturePlan),
        await runOdds(provider, syncJobId, config, fixturePlan),
        await runBroadcasts(provider, syncJobId, config, fixturePlan),
      ];
      return summarizeJobSteps("high-frequency", steps, config);
    },
  },
  catalog: {
    bucket: "catalog",
    async run(provider, syncJobId, config) {
      const steps = [
        await runBookmakerCatalog(provider, syncJobId, config),
        await runPredictions(provider, syncJobId, config),
      ];
      return summarizeJobSteps("catalog", steps, config);
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
    const summary = await jobDefinition.run(provider, job.id, config);
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
