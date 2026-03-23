import { db } from "../db";

export async function startSyncJob({ provider, source, bucket }) {
  return db.syncJob.create({
    data: {
      provider,
      source,
      bucket,
      status: "RUNNING",
      startedAt: new Date(),
    },
  });
}

export async function completeSyncJob(jobId, summary) {
  return db.syncJob.update({
    where: { id: jobId },
    data: {
      status: "SUCCESS",
      finishedAt: new Date(),
      recordsProcessed: summary.recordsProcessed,
      resultSummary: summary.resultSummary,
      errorMessage: null,
    },
  });
}

export async function failSyncJob(jobId, error, summary = {}) {
  return db.syncJob.update({
    where: { id: jobId },
    data: {
      status: "FAILED",
      finishedAt: new Date(),
      recordsProcessed: summary.recordsProcessed || 0,
      resultSummary: summary.resultSummary || null,
      errorMessage: error instanceof Error ? error.message : String(error),
    },
  });
}

export async function saveCheckpoint({
  provider,
  key,
  syncJobId,
  cursor = null,
  payload = null,
  errorMessage = null,
  success = true,
}) {
  const updateData = {
    syncJobId,
    cursor,
    payload,
    errorMessage,
  };

  if (success) {
    updateData.lastSuccessAt = new Date();
    updateData.errorMessage = null;
  } else {
    updateData.lastFailureAt = new Date();
  }

  return db.syncCheckpoint.upsert({
    where: {
      provider_key: {
        provider,
        key,
      },
    },
    update: updateData,
    create: {
      provider,
      key,
      syncJobId,
      cursor,
      payload,
      errorMessage,
      lastSuccessAt: success ? new Date() : null,
      lastFailureAt: success ? null : new Date(),
    },
  });
}

export async function getCheckpoint(provider, key) {
  return db.syncCheckpoint.findUnique({
    where: {
      provider_key: {
        provider,
        key,
      },
    },
  });
}
