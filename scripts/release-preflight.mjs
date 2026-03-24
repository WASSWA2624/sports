import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
import {
  ensureDirectory,
  isPlaceholderValue,
  loadEnvFiles,
  maskSecret,
  pathExists,
  readEnvBoolean,
  readEnvInteger,
  readEnvNumber,
  readEnvString,
} from "./lib/env-utils.mjs";
import { ROOT_DIR, buildReleaseDescriptor, writeJsonFile } from "./lib/release-utils.mjs";

const REPORT_DIR = resolve(ROOT_DIR, "build");
const PROD_ONLY = ["production"];
const STAGE_AND_PROD = ["staging", "production"];
const IMPLEMENTED_PROVIDER_CODES = new Set([
  "SPORTSMONKS",
]);
const PROVIDER_AUTH_EXPECTATIONS = {
  API_SPORTS: {
    header: true,
    host: false,
  },
  API_FOOTBALL: {
    header: true,
    host: false,
  },
  RAPIDAPI_SPORTS: {
    header: true,
    host: true,
  },
};

function pushCheck(report, category, label, status, detail, metadata = null) {
  report.checks.push({
    category,
    label,
    status,
    detail,
    metadata,
  });
  report.summary[status] += 1;

  if (status === "fail") {
    report.status = "fail";
  } else if (status === "warn" && report.status !== "fail") {
    report.status = "attention";
  }
}

function isRequiredForMode(mode, requiredModes = []) {
  return requiredModes.includes(mode);
}

function validateStringSetting(report, mode, category, name, options = {}) {
  const value = readEnvString(name);
  const required = isRequiredForMode(mode, options.requiredModes || []);
  const recommended = isRequiredForMode(mode, options.recommendedModes || []);

  if (!value) {
    if (required) {
      pushCheck(report, category, name, "fail", `${name} is missing.`);
    } else if (recommended) {
      pushCheck(report, category, name, "warn", `${name} is not configured.`);
    } else {
      pushCheck(report, category, name, "pass", `${name} is optional and not configured.`);
    }
    return;
  }

  if (isPlaceholderValue(value) || (options.validate && !options.validate(value))) {
    const detail = `${name} is configured but still looks unsafe for release.`;

    if (required) {
      pushCheck(report, category, name, "fail", detail, {
        value: options.secret ? maskSecret(value) : value,
      });
    } else {
      pushCheck(report, category, name, "warn", detail, {
        value: options.secret ? maskSecret(value) : value,
      });
    }
    return;
  }

  pushCheck(report, category, name, "pass", `${name} is configured.`, {
    value: options.secret ? maskSecret(value) : value,
  });
}

function normalizeProviderCode(value, fallback = "SPORTSMONKS") {
  const normalized = String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized || fallback;
}

function buildProviderEnvCandidates(providerCode, suffix) {
  return [`SPORTS_PROVIDER_${suffix}`, `${normalizeProviderCode(providerCode)}_${suffix}`];
}

function readFirstConfiguredString(names = []) {
  for (const name of names) {
    const value = readEnvString(name);
    if (value) {
      return { name, value };
    }
  }

  return null;
}

function validateAnyStringSetting(report, mode, category, label, names = [], options = {}) {
  const required = isRequiredForMode(mode, options.requiredModes || []);
  const recommended = isRequiredForMode(mode, options.recommendedModes || []);
  const configured = readFirstConfiguredString(names);

  if (!configured) {
    if (required) {
      pushCheck(report, category, label, "fail", `${label} is missing.`, { names });
    } else if (recommended) {
      pushCheck(report, category, label, "warn", `${label} is not configured.`, { names });
    } else {
      pushCheck(report, category, label, "pass", `${label} is optional and not configured.`, {
        names,
      });
    }
    return;
  }

  const { name, value } = configured;
  if (isPlaceholderValue(value) || (options.validate && !options.validate(value))) {
    const detail = `${label} is configured but still looks unsafe for release.`;

    if (required) {
      pushCheck(report, category, label, "fail", detail, {
        names,
        selected: name,
        value: options.secret ? maskSecret(value) : value,
      });
    } else {
      pushCheck(report, category, label, "warn", detail, {
        names,
        selected: name,
        value: options.secret ? maskSecret(value) : value,
      });
    }
    return;
  }

  pushCheck(report, category, label, "pass", `${label} is configured.`, {
    names,
    selected: name,
    value: options.secret ? maskSecret(value) : value,
  });
}

function validateSelectedProviderImplementation(report, mode, providerCode) {
  if (!isRequiredForMode(mode, STAGE_AND_PROD)) {
    return;
  }

  const isImplemented = IMPLEMENTED_PROVIDER_CODES.has(providerCode);
  pushCheck(
    report,
    "providers",
    `${providerCode} adapter readiness`,
    isImplemented ? "pass" : "fail",
    isImplemented
      ? `${providerCode} is implemented in this build.`
      : `${providerCode} is not release-ready in this build. Switch SPORTS_DATA_PROVIDER or add the adapter family before promotion.`
  );
}

function getProviderAuthExpectation(providerCode) {
  return PROVIDER_AUTH_EXPECTATIONS[providerCode] || {
    header: false,
    host: false,
  };
}

function validateNumberSetting(report, mode, category, name, options = {}) {
  const value = options.integer ? readEnvInteger(name) : readEnvNumber(name);
  const required = isRequiredForMode(mode, options.requiredModes || []);
  const recommended = isRequiredForMode(mode, options.recommendedModes || []);

  if (value == null) {
    if (required) {
      pushCheck(report, category, name, "fail", `${name} is missing.`);
    } else if (recommended) {
      pushCheck(report, category, name, "warn", `${name} is not configured.`);
    } else {
      pushCheck(report, category, name, "pass", `${name} is optional and not configured.`);
    }
    return;
  }

  if (
    (options.min != null && value < options.min) ||
    (options.max != null && value > options.max)
  ) {
    const detail = `${name} must be between ${options.min} and ${options.max}.`;

    if (required) {
      pushCheck(report, category, name, "fail", detail, { value });
    } else {
      pushCheck(report, category, name, "warn", detail, { value });
    }
    return;
  }

  pushCheck(report, category, name, "pass", `${name} is within the expected range.`, {
    value,
  });
}

function validateBooleanSetting(report, mode, category, name, options = {}) {
  const value = readEnvBoolean(name);
  const required = isRequiredForMode(mode, options.requiredModes || []);

  if (value == null) {
    if (required) {
      pushCheck(report, category, name, "fail", `${name} is missing.`);
    } else {
      pushCheck(report, category, name, "pass", `${name} is optional and not configured.`);
    }
    return;
  }

  if (options.mustEqual != null && value !== options.mustEqual) {
    const detail = `${name} must be ${String(options.mustEqual)} for this release mode.`;

    if (required) {
      pushCheck(report, category, name, "fail", detail, { value });
    } else {
      pushCheck(report, category, name, "warn", detail, { value });
    }
    return;
  }

  pushCheck(report, category, name, "pass", `${name} is configured.`, { value });
}

async function runCommand(command, args, cwd = ROOT_DIR) {
  return new Promise((resolvePromise) => {
    const child = spawn(command, args, {
      cwd,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk || "");
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk || "");
    });
    child.on("error", (error) => {
      resolvePromise({
        code: 1,
        stdout: stdout.trim(),
        stderr: error instanceof Error ? error.message : String(error),
      });
    });
    child.on("close", (code) => {
      resolvePromise({
        code: code ?? 1,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      });
    });
  });
}

async function checkPrismaStatus(report, mode) {
  const databaseUrl = readEnvString("DATABASE_URL");
  const prismaEntry = resolve(ROOT_DIR, "node_modules", "prisma", "build", "index.js");

  if (!databaseUrl || isPlaceholderValue(databaseUrl)) {
    pushCheck(
      report,
      "database",
      "Prisma migrate status",
      mode === "production" ? "fail" : "warn",
      "DATABASE_URL is not production-safe, so Prisma migration status was not executed."
    );
    return;
  }

  if (!(await pathExists(prismaEntry))) {
    pushCheck(report, "database", "Prisma migrate status", "fail", "Prisma CLI was not found.");
    return;
  }

  const result = await runCommand(process.execPath, [
    prismaEntry,
    "migrate",
    "status",
    "--schema",
    "prisma/schema.prisma",
  ]);
  const detail = result.stdout || result.stderr || "No Prisma output captured.";

  if (result.code === 0) {
    pushCheck(report, "database", "Prisma migrate status", "pass", detail);
  } else {
    pushCheck(report, "database", "Prisma migrate status", "fail", detail);
  }
}

async function checkReleaseDocs(report) {
  const requiredDocs = [
    "docs/production-release-runbook.md",
    "docs/production-release-2026-03-24.md",
    "docs/release-validation-2026-03-24.md",
  ];

  for (const relativePath of requiredDocs) {
    const exists = await pathExists(resolve(ROOT_DIR, relativePath));

    pushCheck(
      report,
      "docs",
      relativePath,
      exists ? "pass" : "fail",
      exists ? `${relativePath} is present.` : `${relativePath} is missing.`
    );
  }
}

export async function runReleasePreflight(options = {}) {
  await loadEnvFiles(ROOT_DIR);

  const descriptor = await buildReleaseDescriptor(ROOT_DIR);
  const mode =
    options.mode ||
    readEnvString("RELEASE_PREFLIGHT_MODE") ||
    (process.env.NODE_ENV === "production" ? "production" : "staging");
  const report = {
    generatedAt: new Date().toISOString(),
    mode,
    status: "pass",
    release: descriptor,
    checks: [],
    summary: {
      pass: 0,
      warn: 0,
      fail: 0,
    },
  };

  pushCheck(
    report,
    "build",
    "Next build artifact",
    descriptor.buildId ? "pass" : "fail",
    descriptor.buildId
      ? `.next/BUILD_ID is present (${descriptor.buildId}).`
      : "No Next.js build artifact was found. Run `npm run build` before promotion."
  );

  pushCheck(
    report,
    "release",
    "Release descriptor",
    "pass",
    `Prepared release ${descriptor.displayVersion} on channel ${descriptor.channel}.`,
    descriptor
  );

  validateStringSetting(report, mode, "core", "DATABASE_URL", {
    requiredModes: STAGE_AND_PROD,
    validate: (value) => value.startsWith("mysql://"),
    secret: true,
  });
  validateStringSetting(report, mode, "core", "AUTH_SECRET", {
    requiredModes: STAGE_AND_PROD,
    validate: (value) => value.length >= 12,
    secret: true,
  });

  const siteUrl =
    readEnvString("NEXT_PUBLIC_SITE_URL") ||
    readEnvString("SITE_URL") ||
    readEnvString("NEXT_PUBLIC_APP_URL");
  if (!siteUrl) {
    pushCheck(
      report,
      "core",
      "Public site URL",
      mode === "production" ? "fail" : "warn",
      "One of NEXT_PUBLIC_SITE_URL, SITE_URL, or NEXT_PUBLIC_APP_URL must be configured."
    );
  } else {
    pushCheck(report, "core", "Public site URL", "pass", `Resolved public origin ${siteUrl}.`);
  }

  validateStringSetting(report, mode, "providers", "SPORTS_DATA_PROVIDER", {
    requiredModes: STAGE_AND_PROD,
  });
  const providerCode = normalizeProviderCode(readEnvString("SPORTS_DATA_PROVIDER"));
  validateSelectedProviderImplementation(report, mode, providerCode);
  validateAnyStringSetting(
    report,
    mode,
    "providers",
    `${providerCode} provider API key`,
    buildProviderEnvCandidates(providerCode, "API_KEY"),
    {
      requiredModes: STAGE_AND_PROD,
      secret: true,
    }
  );
  validateAnyStringSetting(
    report,
    mode,
    "providers",
    `${providerCode} provider base URL`,
    buildProviderEnvCandidates(providerCode, "BASE_URL"),
    {
      recommendedModes: STAGE_AND_PROD,
      validate: (value) => value.startsWith("http://") || value.startsWith("https://"),
    }
  );
  validateAnyStringSetting(
    report,
    mode,
    "providers",
    `${providerCode} provider auth header`,
    buildProviderEnvCandidates(providerCode, "AUTH_HEADER"),
    {
      recommendedModes: getProviderAuthExpectation(providerCode).header ? STAGE_AND_PROD : [],
    }
  );
  validateAnyStringSetting(
    report,
    mode,
    "providers",
    `${providerCode} provider API host`,
    buildProviderEnvCandidates(providerCode, "API_HOST"),
    {
      recommendedModes: getProviderAuthExpectation(providerCode).host ? STAGE_AND_PROD : [],
    }
  );
  validateStringSetting(report, mode, "providers", "SPORTS_SYNC_FAILOVER_PROVIDERS", {
    requiredModes: STAGE_AND_PROD,
  });
  validateNumberSetting(report, mode, "providers", "SPORTS_DATA_ACCESS_TIMEOUT_MS", {
    requiredModes: STAGE_AND_PROD,
    integer: true,
    min: 500,
    max: 20000,
  });
  validateNumberSetting(report, mode, "providers", "SPORTS_PROVIDER_TIMEOUT_MS", {
    recommendedModes: ["staging", "production"],
    integer: true,
    min: 500,
    max: 60000,
  });

  validateBooleanSetting(report, mode, "monitoring", "OPS_METRICS_ENABLED", {
    requiredModes: STAGE_AND_PROD,
  });
  validateNumberSetting(report, mode, "monitoring", "OPS_ROUTE_SLOW_MS", {
    requiredModes: STAGE_AND_PROD,
    integer: true,
    min: 100,
    max: 10000,
  });
  validateNumberSetting(report, mode, "monitoring", "OPS_SEARCH_SLOW_MS", {
    requiredModes: STAGE_AND_PROD,
    integer: true,
    min: 100,
    max: 10000,
  });
  validateStringSetting(report, mode, "monitoring", "OPS_ALERT_WEBHOOK_URL", {
    requiredModes: PROD_ONLY,
    recommendedModes: ["staging"],
    validate: (value) => value.startsWith("http://") || value.startsWith("https://"),
    secret: true,
  });
  validateNumberSetting(report, mode, "monitoring", "OPS_MONITOR_WINDOW_MINUTES", {
    requiredModes: PROD_ONLY,
    integer: true,
    min: 15,
    max: 240,
  });
  validateNumberSetting(report, mode, "monitoring", "OPS_RELEASE_SYNC_LAG_THRESHOLD_MINUTES", {
    requiredModes: PROD_ONLY,
    integer: true,
    min: 1,
    max: 120,
  });
  validateNumberSetting(report, mode, "monitoring", "OPS_RELEASE_SEARCH_P95_THRESHOLD_MS", {
    requiredModes: PROD_ONLY,
    integer: true,
    min: 100,
    max: 5000,
  });
  validateNumberSetting(report, mode, "monitoring", "OPS_RELEASE_CACHE_HIT_RATE_MIN", {
    requiredModes: PROD_ONLY,
    min: 0,
    max: 1,
  });
  validateNumberSetting(report, mode, "monitoring", "OPS_RELEASE_ROUTE_ERRORS_PER_HOUR_MAX", {
    requiredModes: PROD_ONLY,
    integer: true,
    min: 0,
    max: 100,
  });

  validateStringSetting(report, mode, "release", "RELEASE_VERSION", {
    requiredModes: PROD_ONLY,
  });
  validateStringSetting(report, mode, "release", "RELEASE_CHANNEL", {
    requiredModes: PROD_ONLY,
    validate: (value) => value === "production",
  });
  validateStringSetting(report, mode, "release", "RELEASE_COMMIT_SHA", {
    requiredModes: PROD_ONLY,
    validate: (value) => value.length >= 7,
  });
  validateStringSetting(report, mode, "release", "RELEASE_NOTES_URL", {
    requiredModes: PROD_ONLY,
    recommendedModes: ["staging"],
    validate: (value) => value.startsWith("http://") || value.startsWith("https://"),
  });

  for (const [name, max] of [
    ["AUTH_RATE_LIMIT_WINDOW_MS", 3600000],
    ["SEARCH_RATE_LIMIT_WINDOW_MS", 3600000],
    ["ADMIN_RATE_LIMIT_WINDOW_MS", 3600000],
    ["AUTH_RATE_LIMIT_MAX_REQUESTS", 10000],
    ["SEARCH_RATE_LIMIT_MAX_REQUESTS", 100000],
    ["ADMIN_RATE_LIMIT_MAX_REQUESTS", 10000],
    ["EDGE_PUBLIC_S_MAXAGE_SECONDS", 3600],
    ["EDGE_PUBLIC_STALE_WHILE_REVALIDATE_SECONDS", 86400],
    ["EDGE_LIVE_S_MAXAGE_SECONDS", 300],
    ["EDGE_LIVE_STALE_WHILE_REVALIDATE_SECONDS", 3600],
    ["EDGE_NEWS_S_MAXAGE_SECONDS", 3600],
  ]) {
    validateNumberSetting(report, mode, "edge", name, {
      requiredModes: PROD_ONLY,
      integer: true,
      min: 1,
      max,
    });
  }

  validateBooleanSetting(report, mode, "edge", "EDGE_PRIVATE_NO_STORE", {
    requiredModes: PROD_ONLY,
    mustEqual: true,
  });

  for (const name of [
    "NEWS_PROVIDER_KEY",
    "SEARCH_PROVIDER_KEY",
    "ANALYTICS_WRITE_KEY",
    "ADS_PROVIDER_CODE",
    "CONSENT_VENDOR_ID",
    "NOTIFICATION_PROVIDER_KEY",
    "ASSET_CDN_BASE_URL",
  ]) {
    validateStringSetting(report, mode, "optional-providers", name, {
      recommendedModes: ["staging", "production"],
      secret: !name.includes("CDN") && !name.includes("ADS"),
    });
  }

  validateStringSetting(report, mode, "assets", "ASSET_REMOTE_HOSTS", {
    recommendedModes: ["staging", "production"],
    validate: (value) => value.includes("."),
  });
  validateAnyStringSetting(
    report,
    mode,
    "assets",
    `${providerCode} asset hosts`,
    [
      "SPORTS_PROVIDER_ASSET_HOSTS",
      `${providerCode}_ASSET_HOSTS`,
      "ASSET_REMOTE_HOSTS",
    ],
    {
      recommendedModes: ["staging", "production"],
      validate: (value) => value.includes("."),
    }
  );

  await checkPrismaStatus(report, mode);
  await checkReleaseDocs(report);

  const reportPath = resolve(REPORT_DIR, `release-preflight-${descriptor.version}.json`);

  if (options.writeReport !== false) {
    await ensureDirectory(REPORT_DIR);
    await writeJsonFile(reportPath, report);
    report.reportPath = reportPath;
  }

  return report;
}

const isMainModule = fileURLToPath(import.meta.url) === resolve(process.argv[1] || "");

if (isMainModule) {
  const report = await runReleasePreflight();
  console.log(JSON.stringify(report, null, 2));

  if (report.summary.fail > 0) {
    process.exitCode = 1;
  }
}
