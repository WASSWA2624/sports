import { getSportsSyncConfig } from "./config";
import { runSyncJob } from "../sync/jobs";
import { getCheckpoint } from "../sync/service";

const ONE_SECOND_MS = 1000;
const ONE_MINUTE_MS = ONE_SECOND_MS * 60;

const JOB_DEFINITIONS = {
  stable: {
    jobName: "static-ish",
    checkpointKeys: ["taxonomy:snapshot", "fixtures:window", "season:tracked"],
    getMaxAgeMs(config) {
      return Math.max(1, Number(config.stableRefreshMinutes || 0)) * ONE_MINUTE_MS;
    },
  },
  volatile: {
    jobName: "high-frequency",
    checkpointKeys: ["fixtures:live"],
    getMaxAgeMs(config) {
      return Math.max(1, Number(config.volatileRefreshSeconds || 0)) * ONE_SECOND_MS;
    },
  },
  catalog: {
    jobName: "catalog",
    checkpointKeys: ["bookmakers:catalog"],
    getMaxAgeMs(config) {
      return Math.max(1, Number(config.catalogRefreshMinutes || 0)) * ONE_MINUTE_MS;
    },
  },
};

function getRefreshRegistry() {
  if (!globalThis.__sportsSyncRefreshRegistry) {
    globalThis.__sportsSyncRefreshRegistry = new Map();
  }

  return globalThis.__sportsSyncRefreshRegistry;
}

function toTimestamp(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  const timestamp = date.getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function isCheckpointFresh(checkpoint, maxAgeMs, now = Date.now()) {
  const lastSuccessAt = toTimestamp(checkpoint?.lastSuccessAt);
  if (!lastSuccessAt) {
    return false;
  }

  return now - lastSuccessAt <= maxAgeMs;
}

async function loadCheckpoints(provider, checkpointKeys) {
  const checkpoints = await Promise.all(
    checkpointKeys.map(async (key) => ({
      key,
      checkpoint: await getCheckpoint(provider, key),
    }))
  );

  return checkpoints;
}

async function runManagedSync(type, { waitForCompletion = false } = {}) {
  const definition = JOB_DEFINITIONS[type];
  if (!definition) {
    return {
      type,
      status: "unsupported",
      triggered: false,
    };
  }

  const config = getSportsSyncConfig();
  const maxAgeMs = definition.getMaxAgeMs(config);
  const checkpoints = await loadCheckpoints(config.provider, definition.checkpointKeys);
  const now = Date.now();
  const staleKeys = checkpoints
    .filter(({ checkpoint }) => !isCheckpointFresh(checkpoint, maxAgeMs, now))
    .map(({ key }) => key);

  if (!staleKeys.length) {
    return {
      type,
      jobName: definition.jobName,
      status: "fresh",
      triggered: false,
      waited: false,
      staleKeys: [],
    };
  }

  const refreshRegistry = getRefreshRegistry();
  const refreshKey = `${config.provider}:${definition.jobName}`;
  let entry = refreshRegistry.get(refreshKey);
  const shouldWait = waitForCompletion || checkpoints.every(({ checkpoint }) => !checkpoint?.lastSuccessAt);

  if (!entry) {
    const promise = runSyncJob(definition.jobName)
      .then((result) => ({
        status: "success",
        result,
      }))
      .catch((error) => ({
        status: "error",
        error: error instanceof Error ? error.message : String(error),
      }))
      .finally(() => {
        refreshRegistry.delete(refreshKey);
      });

    entry = {
      startedAt: now,
      promise,
    };
    refreshRegistry.set(refreshKey, entry);
  }

  if (!shouldWait) {
    return {
      type,
      jobName: definition.jobName,
      status: "refreshing",
      triggered: true,
      waited: false,
      staleKeys,
    };
  }

  const outcome = await entry.promise;
  return {
    type,
    jobName: definition.jobName,
    status: outcome.status,
    error: outcome.error || null,
    triggered: true,
    waited: true,
    staleKeys,
  };
}

export async function ensureStableSportsDataFresh(options) {
  return runManagedSync("stable", options);
}

export async function ensureVolatileSportsDataFresh(options) {
  return runManagedSync("volatile", options);
}

export async function ensureCatalogSportsDataFresh(options) {
  return runManagedSync("catalog", options);
}
