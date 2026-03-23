import { getSportsSyncConfig } from "../sports/config";
import { db } from "../db";
import { createSportsProvider } from "../sports/provider";
import {
  persistFixtureBatch,
  persistOddsBatch,
  persistStandingsBatch,
  persistTeamBatch,
} from "../sports/repository";
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

function addHours(date, amount) {
  const next = new Date(date);
  next.setUTCHours(next.getUTCHours() + amount);
  return next;
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

async function runActiveFixtureDetails(provider, syncJobId, config) {
  const now = new Date();
  const fixtureRefs = (
    await db.fixture.findMany({
      where: {
        externalRef: { not: null },
        OR: [
          { status: "LIVE" },
          {
            startsAt: {
              gte: addHours(now, -6),
              lte: addHours(now, 2),
            },
          },
        ],
      },
      orderBy: { startsAt: "asc" },
      take: 20,
      select: { externalRef: true },
    })
  )
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
    },
    success: true,
  });

  return recordsProcessed;
}

async function runOdds(provider, syncJobId, config) {
  if (!config.oddsEnabled) {
    return 0;
  }

  const fixtureRefs = config.trackedFixtureRefs.length
    ? config.trackedFixtureRefs
    : (
        await db.fixture.findMany({
          where: {
            OR: [
              { status: "LIVE" },
              { startsAt: { gte: new Date() } },
            ],
          },
          orderBy: { startsAt: "asc" },
          take: 20,
          select: { externalRef: true },
        })
      )
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

export const syncJobRegistry = {
  "static-ish": {
    bucket: "static-ish",
    async run(provider, syncJobId, config) {
      let recordsProcessed = 0;
      recordsProcessed += await runFixturesWindow(provider, syncJobId, config);
      recordsProcessed += await runTrackedSeasonJobs(provider, config.trackedSeasonRefs, syncJobId, config);
      return recordsProcessed;
    },
  },
  daily: {
    bucket: "daily",
    async run(provider, syncJobId, config) {
      let recordsProcessed = 0;
      recordsProcessed += await runFixturesWindow(provider, syncJobId, config);
      recordsProcessed += await runTrackedSeasonJobs(provider, config.trackedSeasonRefs, syncJobId, config);
      return recordsProcessed;
    },
  },
  "high-frequency": {
    bucket: "high-frequency",
    async run(provider, syncJobId, config) {
      let recordsProcessed = 0;
      recordsProcessed += await runLivescores(provider, syncJobId, config);
      recordsProcessed += await runActiveFixtureDetails(provider, syncJobId, config);
      recordsProcessed += await runOdds(provider, syncJobId, config);
      return recordsProcessed;
    },
  },
};

export async function runSyncJob(jobName) {
  const config = getSportsSyncConfig();
  const jobDefinition = syncJobRegistry[jobName];

  if (!jobDefinition) {
    throw new Error(`Unknown sync job: ${jobName}`);
  }

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
