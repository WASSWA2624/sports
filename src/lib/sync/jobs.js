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
  ensureSyncProviderChain,
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

export function getSyncProviderCodes(config = getSportsSyncConfig()) {
  return [...new Set([config.provider, ...(config.fallbackProviders || [])].filter(Boolean))];
}

function isProviderNumericFixtureRef(providerCode) {
  return ["SPORTSMONKS", "SPORTSMONKS_BASKETBALL", "SPORTSMONKS_TENNIS"].includes(
    providerCode
  );
}

function isSupportedFixtureExternalRef(externalRef, config) {
  const normalized = String(externalRef || "").trim();
  if (!normalized) {
    return false;
  }

  if (isProviderNumericFixtureRef(config.provider)) {
    return /^\d+$/.test(normalized);
  }

  return true;
}

function buildProviderAttempt(providerCode, descriptor, status, error = null) {
  return {
    providerCode,
    providerName: descriptor?.name || providerCode,
    role: descriptor?.role || null,
    tier: descriptor?.tier || null,
    implemented: descriptor?.implemented ?? false,
    status,
    ...(error ? { error: formatSyncError(error) } : {}),
  };
}

function buildProviderExecutionMetadata(attempts = []) {
  const attemptedProviders = attempts.map((attempt) => attempt.providerCode);
  const successProvider =
    attempts.find((attempt) => attempt.status === "success")?.providerCode || null;

  return {
    attemptedProviders,
    successProvider,
    failoverUsed: Boolean(
      successProvider && attemptedProviders[0] && successProvider !== attemptedProviders[0]
    ),
    attempts,
  };
}

export function createSyncProviderRuntime(config = getSportsSyncConfig()) {
  const providerCodes = getSyncProviderCodes(config);
  const providerCache = new Map();

  return {
    providerCodes,
    async execute(operationLabel, handler) {
      const attempts = [];

      for (const providerCode of providerCodes) {
        const descriptor = getProviderDescriptor(providerCode);

        try {
          let provider = providerCache.get(providerCode);
          if (!provider) {
            provider = createSportsProvider(providerCode);
            providerCache.set(providerCode, provider);
          }

          const result = await handler(provider, {
            providerCode,
            descriptor,
          });

          return {
            result,
            providerCode,
            descriptor,
            attempts: [...attempts, buildProviderAttempt(providerCode, descriptor, "success")],
          };
        } catch (error) {
          attempts.push(buildProviderAttempt(providerCode, descriptor, "failed", error));
        }
      }

      const failure = new Error(
        `${operationLabel} failed across provider chain: ${attempts
          .map((attempt) => `${attempt.providerCode} (${attempt.error || attempt.status})`)
          .join("; ")}`
      );
      failure.attempts = attempts;
      throw failure;
    },
  };
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

async function runTaxonomySnapshot(providerRuntime, syncJobId, config) {
  try {
    const outcome = await providerRuntime.execute("taxonomy", (provider) =>
      provider.fetchTaxonomy({
        leagueCodes: config.trackedLeagueCodes,
      })
    );
    const taxonomy = outcome.result;
    const recordsProcessed = Array.isArray(taxonomy) ? taxonomy.length : 0;
    const providerExecution = buildProviderExecutionMetadata(outcome.attempts);

    await saveCheckpoint({
      provider: outcome.providerCode,
      key: "taxonomy:snapshot",
      syncJobId,
      cursor: new Date().toISOString(),
      payload: {
        leagueCodes: config.trackedLeagueCodes,
        records: recordsProcessed,
        providerExecution,
      },
      success: true,
    });

    return buildStepResult("taxonomy", {
      recordsProcessed,
      attempted: config.trackedLeagueCodes.length,
      metadata: {
        trackedLeagueCodes: config.trackedLeagueCodes,
        providerExecution,
      },
    });
  } catch (error) {
    await saveCheckpoint({
      provider: config.provider,
      key: "taxonomy:snapshot",
      syncJobId,
      cursor: new Date().toISOString(),
      payload: {
        leagueCodes: config.trackedLeagueCodes,
        providerExecution: buildProviderExecutionMetadata(error.attempts || []),
      },
      errorMessage: formatSyncError(error),
      success: false,
    });
    throw error;
  }
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
  const compatibleFixtures = fixtures.filter((fixture) =>
    isSupportedFixtureExternalRef(fixture.externalRef, config)
  );
  const plan = buildLiveWindowBackpressurePlan(compatibleFixtures, config);

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
    return [...new Set(config.trackedFixtureRefs)].filter((fixtureRef) =>
      isSupportedFixtureExternalRef(fixtureRef, config)
    );
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

  return [...new Set(fixtures.map((fixture) => fixture.externalRef).filter(Boolean))].filter(
    (fixtureRef) => isSupportedFixtureExternalRef(fixtureRef, config)
  );
}

async function runTrackedSeasonJobs(providerRuntime, seasonRefs, syncJobId, config) {
  let recordsProcessed = 0;
  const failures = [];
  const providersUsed = new Set();

  for (const seasonExternalRef of seasonRefs) {
    try {
      const teamsOutcome = await providerRuntime.execute(
        `season:${seasonExternalRef}:teams`,
        (provider) => provider.fetchTeams({ seasonExternalRef })
      );
      const teams = teamsOutcome.result;
      providersUsed.add(teamsOutcome.providerCode);
      recordsProcessed += await persistTeamBatch(teams, seasonExternalRef, {
        providerCode: teamsOutcome.providerCode,
      });

      const standingsOutcome = await providerRuntime.execute(
        `season:${seasonExternalRef}:standings`,
        (provider) => provider.fetchStandings({ seasonExternalRef })
      );
      const standings = standingsOutcome.result;
      providersUsed.add(standingsOutcome.providerCode);
      recordsProcessed += await persistStandingsBatch(standings, {
        providerCode: standingsOutcome.providerCode,
      });
      const providerExecution = {
        teams: buildProviderExecutionMetadata(teamsOutcome.attempts),
        standings: buildProviderExecutionMetadata(standingsOutcome.attempts),
      };

      await saveCheckpoint({
        provider: standingsOutcome.providerCode,
        key: `season:${seasonExternalRef}`,
        syncJobId,
        cursor: seasonExternalRef,
        payload: {
          teams: teams.length,
          standings: standings.length,
          providerExecution,
        },
        success: true,
      });
    } catch (error) {
      failures.push({
        seasonExternalRef,
        error: formatSyncError(error),
        providerExecution: buildProviderExecutionMetadata(error.attempts || []),
      });
      await saveCheckpoint({
        provider: config.provider,
        key: `season:${seasonExternalRef}`,
        syncJobId,
        cursor: seasonExternalRef,
        payload: {
          seasonExternalRef,
          providerExecution: buildProviderExecutionMetadata(error.attempts || []),
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
      providersUsed: [...providersUsed],
    },
  });
}

async function runFixturesWindow(providerRuntime, syncJobId, config) {
  const checkpoint = await getCheckpoint(config.provider, "fixtures:window");
  const now = new Date();
  const startDate = addDays(now, -config.fixtureDaysPast);
  const endDate = addDays(now, config.fixtureDaysAhead);

  try {
    const outcome = await providerRuntime.execute("fixtures-window", (provider) =>
      provider.fetchFixtures({ startDate, endDate })
    );
    const fixtures = outcome.result;
    const recordsProcessed = await persistFixtureBatch(fixtures, {
      providerCode: outcome.providerCode,
    });
    const providerExecution = buildProviderExecutionMetadata(outcome.attempts);

    await saveCheckpoint({
      provider: outcome.providerCode,
      key: "fixtures:window",
      syncJobId,
      cursor: checkpoint?.cursor || endDate.toISOString(),
      payload: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        fixtures: fixtures.length,
        providerExecution,
      },
      success: true,
    });

    return buildStepResult("fixtures-window", {
      recordsProcessed,
      attempted: fixtures.length,
      metadata: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        providerExecution,
      },
    });
  } catch (error) {
    await saveCheckpoint({
      provider: config.provider,
      key: "fixtures:window",
      syncJobId,
      cursor: checkpoint?.cursor || endDate.toISOString(),
      payload: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        providerExecution: buildProviderExecutionMetadata(error.attempts || []),
      },
      errorMessage: formatSyncError(error),
      success: false,
    });
    throw error;
  }
}

async function runLivescores(providerRuntime, syncJobId, config) {
  try {
    const outcome = await providerRuntime.execute("fixtures-live", (provider) =>
      provider.fetchLivescores()
    );
    const fixtures = outcome.result;
    const recordsProcessed = await persistFixtureBatch(fixtures, {
      providerCode: outcome.providerCode,
    });
    const providerExecution = buildProviderExecutionMetadata(outcome.attempts);

    await saveCheckpoint({
      provider: outcome.providerCode,
      key: "fixtures:live",
      syncJobId,
      cursor: new Date().toISOString(),
      payload: {
        fixtures: fixtures.length,
        providerExecution,
      },
      success: true,
    });

    return buildStepResult("livescores", {
      recordsProcessed,
      attempted: fixtures.length,
      metadata: {
        providerExecution,
      },
    });
  } catch (error) {
    await saveCheckpoint({
      provider: config.provider,
      key: "fixtures:live",
      syncJobId,
      cursor: new Date().toISOString(),
      payload: {
        providerExecution: buildProviderExecutionMetadata(error.attempts || []),
      },
      errorMessage: formatSyncError(error),
      success: false,
    });
    throw error;
  }
}

async function runActiveFixtureDetails(providerRuntime, syncJobId, config, fixturePlan) {
  const now = new Date();
  const fixtureRefs = (fixturePlan?.detailFixtures || [])
    .map((fixture) => fixture.externalRef)
    .filter(Boolean);

  let recordsProcessed = 0;
  const failures = [];
  const providersUsed = new Set();

  for (const fixtureExternalRef of fixtureRefs) {
    try {
      const outcome = await providerRuntime.execute(
        `fixture-detail:${fixtureExternalRef}`,
        (provider) => provider.fetchFixtureDetail({ fixtureExternalRef })
      );
      const fixture = outcome.result;
      if (!fixture) {
        continue;
      }

      providersUsed.add(outcome.providerCode);
      recordsProcessed += await persistFixtureBatch([fixture], {
        providerCode: outcome.providerCode,
      });
    } catch (error) {
      failures.push({
        fixtureExternalRef,
        error: formatSyncError(error),
        providerExecution: buildProviderExecutionMetadata(error.attempts || []),
      });
      await saveCheckpoint({
        provider: config.provider,
        key: `fixture-detail:${fixtureExternalRef}`,
        syncJobId,
        cursor: fixtureExternalRef,
        payload: {
          fixtureExternalRef,
          providerExecution: buildProviderExecutionMetadata(error.attempts || []),
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
      providersUsed: [...providersUsed],
    },
  });
}

async function runOdds(providerRuntime, syncJobId, config, fixturePlan) {
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
  const providersUsed = new Set();

  for (const fixtureExternalRef of fixtureRefs) {
    try {
      const outcome = await providerRuntime.execute(`odds:${fixtureExternalRef}`, (provider) =>
        provider.fetchOdds({
          fixtureExternalRef,
          bookmakerIds: config.oddsBookmakers,
        })
      );
      const odds = outcome.result;
      providersUsed.add(outcome.providerCode);
      recordsProcessed += await persistOddsBatch(odds, {
        providerCode: outcome.providerCode,
      });

      await saveCheckpoint({
        provider: outcome.providerCode,
        key: `odds:${fixtureExternalRef}`,
        syncJobId,
        cursor: fixtureExternalRef,
        payload: {
          markets: odds.length,
          providerExecution: buildProviderExecutionMetadata(outcome.attempts),
        },
        success: true,
      });
    } catch (error) {
      failures.push({
        fixtureExternalRef,
        error: formatSyncError(error),
        providerExecution: buildProviderExecutionMetadata(error.attempts || []),
      });
      await saveCheckpoint({
        provider: config.provider,
        key: `odds:${fixtureExternalRef}`,
        syncJobId,
        cursor: fixtureExternalRef,
        payload: {
          fixtureExternalRef,
          providerExecution: buildProviderExecutionMetadata(error.attempts || []),
        },
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
      providersUsed: [...providersUsed],
    },
  });
}

async function runBroadcasts(providerRuntime, syncJobId, config, fixturePlan) {
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
  const providersUsed = new Set();

  for (const fixtureExternalRef of fixtureRefs) {
    try {
      const outcome = await providerRuntime.execute(`broadcast:${fixtureExternalRef}`, (provider) =>
        provider.fetchMediaMetadata({
          fixtureExternalRef,
        })
      );
      const channels = outcome.result;
      providersUsed.add(outcome.providerCode);
      recordsProcessed += await replaceBroadcastChannels(fixtureExternalRef, channels, {
        providerCode: outcome.providerCode,
      });

      await saveCheckpoint({
        provider: outcome.providerCode,
        key: `broadcast:${fixtureExternalRef}`,
        syncJobId,
        cursor: fixtureExternalRef,
        payload: {
          channels: channels.length,
          providerExecution: buildProviderExecutionMetadata(outcome.attempts),
        },
        success: true,
      });
    } catch (error) {
      failures.push({
        fixtureExternalRef,
        error: formatSyncError(error),
        providerExecution: buildProviderExecutionMetadata(error.attempts || []),
      });
      await saveCheckpoint({
        provider: config.provider,
        key: `broadcast:${fixtureExternalRef}`,
        syncJobId,
        cursor: fixtureExternalRef,
        payload: {
          fixtureExternalRef,
          providerExecution: buildProviderExecutionMetadata(error.attempts || []),
        },
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
    metadata: {
      providersUsed: [...providersUsed],
    },
  });
}

async function runBookmakerCatalog(providerRuntime, syncJobId, config) {
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
  const providersUsed = new Set();

  for (const fixtureExternalRef of fixtureRefs) {
    try {
      const outcome = await providerRuntime.execute(`bookmaker-catalog:${fixtureExternalRef}`, (provider) =>
        provider.fetchOdds({
          fixtureExternalRef,
          bookmakerIds: config.oddsBookmakers,
        })
      );
      const odds = outcome.result;
      providersUsed.add(outcome.providerCode);
      recordsProcessed += await persistOddsBatch(odds, {
        providerCode: outcome.providerCode,
      });
    } catch (error) {
      failures.push({
        fixtureExternalRef,
        error: formatSyncError(error),
        providerExecution: buildProviderExecutionMetadata(error.attempts || []),
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
      providersUsed: [...providersUsed],
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
    metadata: {
      providersUsed: [...providersUsed],
    },
  });
}

async function runPredictions(providerRuntime, syncJobId, config) {
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
  const providersUsed = new Set();

  for (const fixtureExternalRef of fixtureRefs) {
    try {
      const outcome = await providerRuntime.execute(`predictions:${fixtureExternalRef}`, (provider) =>
        provider.fetchPredictions({ fixtureExternalRef })
      );
      const predictions = outcome.result;
      providersUsed.add(outcome.providerCode);
      recordsProcessed += await persistPredictionBatch(predictions, {
        providerCode: outcome.providerCode,
      });

      await saveCheckpoint({
        provider: outcome.providerCode,
        key: `predictions:${fixtureExternalRef}`,
        syncJobId,
        cursor: fixtureExternalRef,
        payload: {
          predictions: Array.isArray(predictions) ? predictions.length : 0,
          providerExecution: buildProviderExecutionMetadata(outcome.attempts),
        },
        success: true,
      });
    } catch (error) {
      failures.push({
        fixtureExternalRef,
        error: formatSyncError(error),
        providerExecution: buildProviderExecutionMetadata(error.attempts || []),
      });
      await saveCheckpoint({
        provider: config.provider,
        key: `predictions:${fixtureExternalRef}`,
        syncJobId,
        cursor: fixtureExternalRef,
        payload: {
          fixtureExternalRef,
          providerExecution: buildProviderExecutionMetadata(error.attempts || []),
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
      providersUsed: [...providersUsed],
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
    metadata: {
      providersUsed: [...providersUsed],
    },
  });
}

export const syncJobRegistry = {
  "static-ish": {
    bucket: "static-ish",
    async run(providerRuntime, syncJobId, config) {
      const steps = [
        await runTaxonomySnapshot(providerRuntime, syncJobId, config),
        await runFixturesWindow(providerRuntime, syncJobId, config),
        await runTrackedSeasonJobs(providerRuntime, config.trackedSeasonRefs, syncJobId, config),
      ];
      return summarizeJobSteps("static-ish", steps, config);
    },
  },
  daily: {
    bucket: "daily",
    async run(providerRuntime, syncJobId, config) {
      const steps = [
        await runTaxonomySnapshot(providerRuntime, syncJobId, config),
        await runFixturesWindow(providerRuntime, syncJobId, config),
        await runTrackedSeasonJobs(providerRuntime, config.trackedSeasonRefs, syncJobId, config),
      ];
      return summarizeJobSteps("daily", steps, config);
    },
  },
  "high-frequency": {
    bucket: "high-frequency",
    async run(providerRuntime, syncJobId, config) {
      const fixturePlan = await getHighFrequencyFixturePlan(config);
      const steps = [
        await runLivescores(providerRuntime, syncJobId, config),
        await runActiveFixtureDetails(providerRuntime, syncJobId, config, fixturePlan),
        await runOdds(providerRuntime, syncJobId, config, fixturePlan),
        await runBroadcasts(providerRuntime, syncJobId, config, fixturePlan),
      ];
      return summarizeJobSteps("high-frequency", steps, config);
    },
  },
  catalog: {
    bucket: "catalog",
    async run(providerRuntime, syncJobId, config) {
      const steps = [
        await runBookmakerCatalog(providerRuntime, syncJobId, config),
        await runPredictions(providerRuntime, syncJobId, config),
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

  await ensureSyncProviderChain(getSyncProviderCodes(config));
  await ensureProviderIsActive(config.provider);
  const job = await startSyncJob({
    provider: config.provider,
    source: jobName,
    bucket: jobDefinition.bucket,
  });

  try {
    const providerRuntime = createSyncProviderRuntime(config);
    const summary = await jobDefinition.run(providerRuntime, job.id, config);
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
