import { readdir, readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { resolve, relative } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import {
  buildReleaseDescriptor,
  getPackageMetadata,
  ROOT_DIR,
  writeJsonFile,
} from "./lib/release-utils.mjs";
import {
  compactDateString,
  ensureDirectory,
  loadEnvFiles,
  pathExists,
} from "./lib/env-utils.mjs";

const BASELINE_DIR = resolve(ROOT_DIR, "build", "baselines");
const APP_DIR = resolve(ROOT_DIR, "src", "app");
const API_DIR = resolve(APP_DIR, "api");
const SRC_DIR = resolve(ROOT_DIR, "src");
const SCHEMA_PATH = resolve(ROOT_DIR, "prisma", "schema.prisma");
const CACHE_TAGS_PATH = resolve(ROOT_DIR, "src", "lib", "cache-tags.js");
const NEXT_BIN = resolve(ROOT_DIR, "node_modules", "next", "dist", "bin", "next");
const DEFAULT_PORT = Number(process.env.BASELINE_PORT || 3025);
const REQUEST_TIMEOUT_MS = Number(process.env.BASELINE_TIMEOUT_MS || 7000);
const READY_TIMEOUT_MS = Number(process.env.BASELINE_READY_TIMEOUT_MS || 60000);

function toPosix(pathname) {
  return String(pathname || "").replace(/\\/g, "/");
}

function normalizeLabel(value = new Date().toISOString().slice(0, 10)) {
  return String(value)
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

async function walkFiles(rootDir) {
  const results = [];
  const stack = [rootDir];

  while (stack.length) {
    const currentDir = stack.pop();
    const entries = await readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const pathname = resolve(currentDir, entry.name);

      if (entry.isDirectory()) {
        stack.push(pathname);
        continue;
      }

      results.push(pathname);
    }
  }

  return results;
}

function toPageRoute(relativePath) {
  const normalized = toPosix(relativePath);

  if (normalized === "page.jsx" || normalized === "page.js") {
    return "/";
  }

  if (normalized === "robots.js") {
    return "/robots.txt";
  }

  if (normalized === "sitemap.js") {
    return "/sitemap.xml";
  }

  if (normalized.endsWith("/page.jsx") || normalized.endsWith("/page.js")) {
    return `/${normalized.replace(/\/page\.(jsx|js)$/, "")}`;
  }

  return null;
}

function toApiRoute(relativePath) {
  const normalized = toPosix(relativePath);
  return `/${normalized.replace(/\/route\.js$/, "")}`;
}

async function getRouteInventory() {
  const allAppFiles = await walkFiles(APP_DIR);
  const pageFiles = allAppFiles
    .filter((pathname) =>
      /(?:^|\/)(page\.(?:js|jsx)|robots\.js|sitemap\.js)$/.test(toPosix(relative(ROOT_DIR, pathname)))
    )
    .sort();
  const apiRouteFiles = (await walkFiles(API_DIR))
    .filter((pathname) => pathname.endsWith("route.js"))
    .sort();

  const pageRoutes = pageFiles
    .map((pathname) => {
      const relativePath = relative(APP_DIR, pathname);
      return {
        file: toPosix(relative(ROOT_DIR, pathname)),
        route: toPageRoute(relativePath),
      };
    })
    .filter((entry) => entry.route);

  const apiRoutes = apiRouteFiles.map((pathname) => ({
    file: toPosix(relative(ROOT_DIR, pathname)),
    route: toApiRoute(relative(API_DIR, pathname)),
  }));

  return {
    pageRoutes,
    apiRoutes,
  };
}

async function getSchemaInventory() {
  const schema = await readFile(SCHEMA_PATH, "utf8");
  return {
    modelCount: (schema.match(/^model\s+/gm) || []).length,
    enumCount: (schema.match(/^enum\s+/gm) || []).length,
  };
}

async function getMigrationInventory() {
  const migrationRoot = resolve(ROOT_DIR, "prisma", "migrations");
  const entries = await readdir(migrationRoot, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

async function getTestInventory() {
  const files = await walkFiles(SRC_DIR);

  return files
    .filter((pathname) => /\.test\.(js|jsx)$/.test(pathname))
    .map((pathname) => toPosix(relative(ROOT_DIR, pathname)))
    .sort();
}

async function getCacheTags() {
  const contents = await readFile(CACHE_TAGS_PATH, "utf8");
  return [...new Set(
    [...contents.matchAll(/"([a-z0-9:-]+)"/g)]
      .map((match) => match[1])
  )].sort();
}

async function getRequiredDocsStatus() {
  const docs = [
    "docs/handoff-technical-2026-03-24.md",
    "docs/handoff-operations-2026-03-24.md",
    "docs/handoff-roadmap-2026-03-24.md",
    "docs/handoff-maintenance-2026-03-24.md",
    "docs/handoff-walkthroughs-2026-03-24.md",
    "docs/baseline-metrics-2026-03-24.md",
    "docs/release-validation-2026-03-24.md",
    "docs/production-release-runbook.md",
    "docs/production-release-2026-03-24.md",
  ];

  const results = [];

  for (const relativePath of docs) {
    results.push({
      path: relativePath,
      present: await pathExists(resolve(ROOT_DIR, relativePath)),
    });
  }

  return results;
}

async function getPackageScripts() {
  const packageJson = JSON.parse(await readFile(resolve(ROOT_DIR, "package.json"), "utf8"));
  return {
    scripts: packageJson.scripts || {},
    dependencies: packageJson.dependencies || {},
    devDependencies: packageJson.devDependencies || {},
  };
}

function startServer(logLines) {
  const child = spawn(process.execPath, [NEXT_BIN, "start", "-p", String(DEFAULT_PORT)], {
    cwd: ROOT_DIR,
    env: {
      ...process.env,
      PORT: String(DEFAULT_PORT),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  const remember = (chunk) => {
    const text = String(chunk || "");

    for (const line of text.split(/\r?\n/)) {
      if (!line.trim()) {
        continue;
      }

      logLines.push(line);
      if (logLines.length > 40) {
        logLines.shift();
      }
    }
  };

  child.stdout.on("data", remember);
  child.stderr.on("data", remember);
  return child;
}

async function fetchWithTimeout(baseUrl, path) {
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const startedAt = Date.now();

  try {
    const response = await fetch(new URL(path, baseUrl), {
      redirect: "manual",
      signal: controller.signal,
    });
    return {
      response,
      durationMs: Date.now() - startedAt,
    };
  } finally {
    clearTimeout(timeoutHandle);
  }
}

async function waitForServer(baseUrl) {
  const deadline = Date.now() + READY_TIMEOUT_MS;

  while (Date.now() < deadline) {
    try {
      const { response } = await fetchWithTimeout(baseUrl, "/robots.txt");
      if (response.status >= 200 && response.status < 500) {
        return true;
      }
    } catch (error) {
      // Keep polling.
    }

    await delay(1000);
  }

  return false;
}

async function probeRuntime(baseUrl) {
  const home = await fetchWithTimeout(baseUrl, "/en");
  const homeBody = await home.response.text();
  const search = await fetchWithTimeout(baseUrl, "/api/search?q=Arsenal&locale=en&limit=6");
  const searchPayload = await search.response.json();
  const health = await fetchWithTimeout(baseUrl, "/api/health");
  const healthPayload = await health.response.json();

  return {
    baseUrl,
    probes: {
      home: {
        status: home.response.status,
        durationMs: home.durationMs,
        containsScoresLabel: homeBody.includes("Scores") || homeBody.includes("Open live board"),
      },
      search: {
        status: search.response.status,
        durationMs: search.durationMs,
        totalResults: searchPayload?.summary?.total ?? null,
        degraded: Boolean(searchPayload?.degraded),
      },
      health: {
        status: health.response.status,
        durationMs: health.durationMs,
        serviceStatus: healthPayload?.status || null,
        providerChainLength: Array.isArray(healthPayload?.providerChain)
          ? healthPayload.providerChain.length
          : 0,
      },
    },
  };
}

async function collectRuntimeMetrics() {
  const requestedBaseUrl = process.env.BASELINE_BASE_URL || process.env.BASE_URL || null;
  const buildReady = await pathExists(resolve(ROOT_DIR, ".next", "BUILD_ID"));
  const logLines = [];
  let child = null;
  let baseUrl = requestedBaseUrl;
  const warnings = [];

  try {
    if (!baseUrl) {
      if (!buildReady) {
        warnings.push("No BASELINE_BASE_URL was provided and no .next build artifact exists.");
        return {
          runtime: null,
          warnings,
        };
      }

      if (!(await pathExists(NEXT_BIN))) {
        warnings.push("Next.js runtime binary was not found for baseline probing.");
        return {
          runtime: null,
          warnings,
        };
      }

      baseUrl = `http://127.0.0.1:${DEFAULT_PORT}`;
      child = startServer(logLines);

      if (!(await waitForServer(baseUrl))) {
        warnings.push("Timed out waiting for the local baseline probe server to become ready.");
        return {
          runtime: null,
          warnings,
          serverLogs: logLines,
        };
      }
    }

    return {
      runtime: await probeRuntime(baseUrl),
      warnings,
    };
  } catch (error) {
    warnings.push(error instanceof Error ? error.message : String(error));
    return {
      runtime: null,
      warnings,
      serverLogs: logLines,
    };
  } finally {
    if (child && !child.killed) {
      child.kill();
    }
  }
}

export async function archiveBaselineMetrics() {
  await loadEnvFiles(ROOT_DIR);

  const generatedAt = new Date().toISOString();
  const label = normalizeLabel(process.env.BASELINE_LABEL || generatedAt.slice(0, 10));
  const buildReady = await pathExists(resolve(ROOT_DIR, ".next", "BUILD_ID"));
  const releaseEnv = {
    ...process.env,
    NODE_ENV: process.env.NODE_ENV || (buildReady ? "production" : "development"),
  };
  const [release, packageMetadata, routeInventory, schema, migrations, tests, cacheTags, docs, pkg, runtime] =
    await Promise.all([
      buildReleaseDescriptor(ROOT_DIR, releaseEnv),
      getPackageMetadata(ROOT_DIR),
      getRouteInventory(),
      getSchemaInventory(),
      getMigrationInventory(),
      getTestInventory(),
      getCacheTags(),
      getRequiredDocsStatus(),
      getPackageScripts(),
      collectRuntimeMetrics(),
    ]);

  const payload = {
    generatedAt,
    label,
    package: packageMetadata,
    release,
    inventory: {
      schema,
      migrations: {
        count: migrations.length,
        items: migrations,
      },
      routes: {
        publicPageCount: routeInventory.pageRoutes.length,
        apiRouteCount: routeInventory.apiRoutes.length,
        publicPages: routeInventory.pageRoutes,
        apiRoutes: routeInventory.apiRoutes,
      },
      tests: {
        count: tests.length,
        files: tests,
      },
      cacheTags: {
        count: cacheTags.length,
        items: cacheTags,
      },
    },
    docs,
    scripts: {
      keys: Object.keys(pkg.scripts).sort(),
      values: pkg.scripts,
    },
    dependencies: {
      runtime: pkg.dependencies,
      development: pkg.devDependencies,
    },
    runtime,
  };

  const filename = `baseline-${release.version}-${compactDateString(generatedAt)}-${label}.json`;
  const pathname = resolve(BASELINE_DIR, filename);

  await ensureDirectory(BASELINE_DIR);
  await writeJsonFile(pathname, payload);

  return {
    path: pathname,
    payload,
  };
}

const summary = await archiveBaselineMetrics();
console.log(JSON.stringify(summary, null, 2));
