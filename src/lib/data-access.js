const DEFAULT_DATA_ACCESS_TIMEOUT_MS = 4000;

function clampTimeoutMs(value, fallback = DEFAULT_DATA_ACCESS_TIMEOUT_MS) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(20000, Math.max(500, Math.round(parsed)));
}

function createDataAccessTimeoutError(label, timeoutMs) {
  const error = new Error(`${label} timed out after ${timeoutMs}ms.`);
  error.name = "DataAccessTimeoutError";
  error.code = "DATA_ACCESS_TIMEOUT";
  error.timeoutMs = timeoutMs;
  return error;
}

export function getDataAccessTimeoutMs() {
  return clampTimeoutMs(process.env.SPORTS_DATA_ACCESS_TIMEOUT_MS);
}

export function isDataAccessTimeoutError(error) {
  return error?.code === "DATA_ACCESS_TIMEOUT";
}

export async function withDataAccessTimeout(
  task,
  { label = "Data access", timeoutMs = getDataAccessTimeoutMs() } = {}
) {
  let timeoutHandle = null;

  try {
    return await Promise.race([
      Promise.resolve().then(() => task()),
      new Promise((_, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(createDataAccessTimeoutError(label, timeoutMs));
        }, timeoutMs);

        if (typeof timeoutHandle?.unref === "function") {
          timeoutHandle.unref();
        }
      }),
    ]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

export async function safeDataRead(task, fallback, options) {
  try {
    return await withDataAccessTimeout(task, options);
  } catch (error) {
    return fallback;
  }
}
