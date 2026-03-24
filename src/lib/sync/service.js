import { db } from "../db";
import { getProviderDescriptor } from "../sports/provider";
import { getProviderContext, upsertSourceProviderRecord } from "../sports/provider-state";

async function ensureSyncSourceProvider(providerCode, { fallbackProviderId = undefined } = {}) {
  const descriptor = getProviderDescriptor(providerCode);
  if (!descriptor) {
    return null;
  }

  return upsertSourceProviderRecord(db, getProviderContext(providerCode), {
    fallbackProviderId,
  });
}

export async function ensureSyncProviderChain(providerCodes = []) {
  const uniqueProviderCodes = [...new Set((providerCodes || []).filter(Boolean))];
  const providersByCode = new Map();

  for (const providerCode of uniqueProviderCodes) {
    const storedProvider = await ensureSyncSourceProvider(providerCode);
    if (storedProvider) {
      providersByCode.set(providerCode, storedProvider);
    }
  }

  for (const providerCode of uniqueProviderCodes) {
    if (!providersByCode.has(providerCode)) {
      continue;
    }

    const providerContext = getProviderContext(providerCode);
    const fallbackProviderCode = (providerContext.providerFallbackFor || []).find((code) =>
      providersByCode.has(code)
    );

    if (!fallbackProviderCode) {
      continue;
    }

    const storedProvider = await ensureSyncSourceProvider(providerCode, {
      fallbackProviderId: providersByCode.get(fallbackProviderCode).id,
    });

    if (storedProvider) {
      providersByCode.set(providerCode, storedProvider);
    }
  }

  return providersByCode;
}

export async function startSyncJob({ provider, source, bucket }) {
  const sourceProvider = await ensureSyncSourceProvider(provider);

  return db.syncJob.create({
    data: {
      sourceProviderId: sourceProvider?.id || null,
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
  markSuccess = success,
  markFailure = !success,
}) {
  const sourceProvider = await ensureSyncSourceProvider(provider);
  const updateData = {
    sourceProviderId: sourceProvider?.id || null,
    syncJobId,
    cursor,
    payload,
    errorMessage,
  };

  if (markSuccess) {
    updateData.lastSuccessAt = new Date();
  } else {
    updateData.lastSuccessAt = undefined;
  }

  if (markFailure) {
    updateData.lastFailureAt = new Date();
  } else if (markSuccess) {
    updateData.errorMessage = null;
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
      sourceProviderId: sourceProvider?.id || null,
      provider,
      key,
      syncJobId,
      cursor,
      payload,
      errorMessage,
      lastSuccessAt: markSuccess ? new Date() : null,
      lastFailureAt: markFailure ? new Date() : null,
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
