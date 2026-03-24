import { spawn } from "node:child_process";
import { resolve, dirname } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const DEFAULT_PORT = Number(process.env.SMOKE_PORT || 3015);
const BASE_URL = process.env.BASE_URL || `http://127.0.0.1:${DEFAULT_PORT}`;
const REQUEST_TIMEOUT_MS = Number(process.env.SMOKE_TIMEOUT_MS || 7000);
const SERVER_READY_TIMEOUT_MS = Number(process.env.SMOKE_READY_TIMEOUT_MS || 60000);
const ROOT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const NEXT_BIN = resolve(ROOT_DIR, "node_modules", "next", "dist", "bin", "next");

function normalizePath(path) {
  return String(path).startsWith("/") ? path : `/${path}`;
}

async function fetchWithTimeout(path, options = {}) {
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const startedAt = Date.now();

  try {
    const response = await fetch(new URL(normalizePath(path), BASE_URL), {
      redirect: "manual",
      ...options,
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

async function readTextResponse(path, { statuses = [200], contains = [] } = {}) {
  let response;
  let durationMs;

  try {
    ({ response, durationMs } = await fetchWithTimeout(path));
  } catch (error) {
    throw new Error(`${path} failed: ${error instanceof Error ? error.message : String(error)}`);
  }
  const body = await response.text();

  if (!statuses.includes(response.status)) {
    throw new Error(`${path} returned ${response.status}.`);
  }

  for (const fragment of contains) {
    if (!body.includes(fragment)) {
      throw new Error(`${path} did not include expected text: ${fragment}`);
    }
  }

  return {
    path,
    status: response.status,
    durationMs,
    body,
  };
}

async function readJsonResponse(path, { statuses = [200], validate } = {}) {
  let response;
  let durationMs;

  try {
    ({ response, durationMs } = await fetchWithTimeout(path));
  } catch (error) {
    throw new Error(`${path} failed: ${error instanceof Error ? error.message : String(error)}`);
  }
  const payload = await response.json();

  if (!statuses.includes(response.status)) {
    throw new Error(`${path} returned ${response.status}.`);
  }

  if (typeof validate === "function") {
    validate(payload, response);
  }

  return {
    path,
    status: response.status,
    durationMs,
    payload,
  };
}

function extractSitemapUrls(xml) {
  return [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
}

function firstMatchingUrl(urls, pattern) {
  return urls.find((url) => pattern.test(url)) || null;
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

async function waitForServer() {
  const deadline = Date.now() + SERVER_READY_TIMEOUT_MS;

  while (Date.now() < deadline) {
    try {
      const { response } = await fetchWithTimeout("/robots.txt");
      if (response.status >= 200 && response.status < 500) {
        return;
      }
    } catch (error) {
      // Keep polling until the server is ready.
    }

    await delay(1000);
  }

  throw new Error(`Timed out waiting for ${BASE_URL} to become ready.`);
}

async function maybeCheckDynamicRoute(urls, pattern, label) {
  const target = firstMatchingUrl(urls, pattern);

  if (!target) {
    return {
      label,
      skipped: true,
      reason: "No matching sitemap entry was available in this environment.",
    };
  }

  const parsed = new URL(target);
  const route = `${parsed.pathname}${parsed.search}`;
  const result = await readTextResponse(route, { statuses: [200] });
  return {
    label,
    skipped: false,
    route,
    status: result.status,
    durationMs: result.durationMs,
  };
}

async function runSmokeSuite() {
  const checks = [];

  checks.push(
    await readTextResponse("/robots.txt", {
      statuses: [200],
      contains: ["Sitemap:", "/api/", "/en/search"],
    })
  );

  const sitemap = await readTextResponse("/sitemap.xml", {
    statuses: [200],
    contains: ["/en/news", "/fr/news", "/sw/news"],
  });
  checks.push(sitemap);

  const staticRoutes = [
    "/en",
    "/en/live",
    "/en/fixtures",
    "/en/results",
    "/en/tables",
    "/en/teams",
    "/en/news",
    "/en/favorites",
    "/en/admin",
    "/fr",
    "/sw/news",
  ];

  for (const route of staticRoutes) {
    checks.push(await readTextResponse(route, { statuses: [200] }));
  }

  checks.push(
    await readTextResponse("/en/search?q=arsenal", {
      statuses: [200],
      contains: ["noindex", "follow"],
    })
  );

  checks.push(
    await readJsonResponse("/api/search?q=Arsenal&locale=en&limit=6", {
      statuses: [200],
      validate(payload) {
        if (!payload.summary || !payload.sections || !Array.isArray(payload.topResults)) {
          throw new Error("/api/search returned an unexpected payload shape.");
        }
      },
    })
  );

  checks.push(
    await readJsonResponse("/api/health", {
      statuses: [200, 503],
      validate(payload) {
        if (!payload.status) {
          throw new Error("/api/health returned an unexpected payload shape.");
        }

        if (payload.status === "ok" && !Array.isArray(payload.providerChain)) {
          throw new Error("/api/health returned an unexpected payload shape.");
        }
      },
    })
  );

  const sitemapUrls = extractSitemapUrls(sitemap.body);
  const dynamicChecks = [
    await maybeCheckDynamicRoute(sitemapUrls, /\/en\/leagues\/[^/]+$/, "league-detail"),
    await maybeCheckDynamicRoute(sitemapUrls, /\/en\/teams\/[^/]+$/, "team-detail"),
    await maybeCheckDynamicRoute(sitemapUrls, /\/en\/match\/[^/]+$/, "match-detail"),
    await maybeCheckDynamicRoute(sitemapUrls, /\/en\/news\/[^/]+$/, "news-article"),
  ];

  return {
    baseUrl: BASE_URL,
    checks: checks.map((entry) => ({
      path: entry.path,
      status: entry.status,
      durationMs: entry.durationMs,
    })),
    dynamicChecks,
  };
}

async function main() {
  const logLines = [];
  let child = null;

  try {
    if (!process.env.BASE_URL) {
      child = startServer(logLines);
    }

    await waitForServer();
    const summary = await runSmokeSuite();

    console.log(JSON.stringify(summary, null, 2));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    console.error(
      JSON.stringify(
        {
          baseUrl: BASE_URL,
          error: message,
          serverLogs: logLines,
        },
        null,
        2
      )
    );
    process.exitCode = 1;
  } finally {
    if (child && !child.killed) {
      child.kill();
    }
  }
}

await main();
