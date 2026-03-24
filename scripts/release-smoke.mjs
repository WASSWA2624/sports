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
const SMOKE_DATE = process.env.SMOKE_DATE || new Date().toISOString().slice(0, 10);

function normalizePath(path) {
  return String(path).startsWith("/") ? path : `/${path}`;
}

function normalizeRouteFromHref(href) {
  if (!href) {
    return null;
  }

  const parsed = new URL(href, BASE_URL);
  return `${parsed.pathname}${parsed.search}`;
}

class CookieJar {
  constructor() {
    this.cookies = new Map();
  }

  remember(response) {
    const setCookieValues =
      typeof response.headers.getSetCookie === "function"
        ? response.headers.getSetCookie()
        : response.headers.get("set-cookie")
          ? [response.headers.get("set-cookie")]
          : [];

    for (const value of setCookieValues) {
      const firstPart = String(value || "").split(";")[0];
      const separatorIndex = firstPart.indexOf("=");

      if (separatorIndex <= 0) {
        continue;
      }

      const name = firstPart.slice(0, separatorIndex).trim();
      const cookieValue = firstPart.slice(separatorIndex + 1).trim();

      if (!name || !cookieValue) {
        continue;
      }

      this.cookies.set(name, cookieValue);
    }
  }

  toHeader() {
    return [...this.cookies.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
  }
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

async function readTextResponse(
  path,
  { statuses = [200], contains = [], containsAny = [], headers, validate } = {}
) {
  let response;
  let durationMs;

  try {
    ({ response, durationMs } = await fetchWithTimeout(path, { headers }));
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

  if (containsAny.length && !containsAny.some((fragment) => body.includes(fragment))) {
    throw new Error(`${path} did not include any expected text fragments.`);
  }

  if (typeof validate === "function") {
    validate(body, response);
  }

  return {
    path,
    status: response.status,
    durationMs,
    body,
  };
}

async function readJsonResponse(
  path,
  { statuses = [200], headers, method = "GET", body, validate } = {}
) {
  let response;
  let durationMs;

  try {
    ({ response, durationMs } = await fetchWithTimeout(path, {
      method,
      headers,
      body,
    }));
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

function pickSearchHref(payload, sectionKey, type) {
  const section = payload?.sections?.[sectionKey];

  if (Array.isArray(section)) {
    const sectionMatch = section.find((entry) => entry?.href);
    if (sectionMatch?.href) {
      return sectionMatch.href;
    }
  }

  const topResultMatch = payload?.topResults?.find((entry) => entry?.type === type && entry?.href);
  return topResultMatch?.href || null;
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

async function checkText(label, path, options = {}) {
  const result = await readTextResponse(path, options);
  return {
    label,
    path: result.path,
    status: result.status,
    durationMs: result.durationMs,
  };
}

async function checkJson(label, path, options = {}) {
  const result = await readJsonResponse(path, options);
  return {
    label,
    path: result.path,
    status: result.status,
    durationMs: result.durationMs,
    payload: result.payload,
  };
}

async function maybeCheckDynamicText(label, route, options = {}) {
  if (!route) {
    return {
      label,
      skipped: true,
      reason: "No matching route was available in sitemap/search discovery.",
    };
  }

  const result = await checkText(label, route, options);
  return {
    ...result,
    skipped: false,
  };
}

async function runAdminChecks() {
  const checks = [];

  checks.push(
    await checkJson("admin-protected-anonymous", "/api/protected/admin", {
      statuses: [401],
      validate(payload) {
        if (!payload.error) {
          throw new Error("Anonymous admin check did not return an error payload.");
        }
      },
    })
  );

  const adminEmail = process.env.SMOKE_ADMIN_EMAIL;
  const adminPassword = process.env.SMOKE_ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    checks.push({
      label: "admin-authenticated-session",
      skipped: true,
      reason: "SMOKE_ADMIN_EMAIL and SMOKE_ADMIN_PASSWORD were not provided.",
    });
    return checks;
  }

  const cookieJar = new CookieJar();
  const login = await fetchWithTimeout("/api/auth/login", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      email: adminEmail,
      password: adminPassword,
    }),
  });
  cookieJar.remember(login.response);
  const loginPayload = await login.response.json();

  if (
    login.response.status !== 200 ||
    !loginPayload.user ||
    !Array.isArray(loginPayload.user.roles) ||
    !loginPayload.user.roles.includes("ADMIN")
  ) {
    throw new Error("Admin login failed during smoke validation.");
  }

  checks.push({
    label: "admin-login",
    path: "/api/auth/login",
    status: login.response.status,
    durationMs: login.durationMs,
  });

  const stepUp = await fetchWithTimeout("/api/auth/step-up", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: cookieJar.toHeader(),
    },
    body: JSON.stringify({
      password: adminPassword,
      purpose: "admin",
    }),
  });
  cookieJar.remember(stepUp.response);
  const stepUpPayload = await stepUp.response.json();

  if (stepUp.response.status !== 200 || !stepUpPayload.ok) {
    throw new Error("Admin step-up failed during smoke validation.");
  }

  checks.push({
    label: "admin-step-up",
    path: "/api/auth/step-up",
    status: stepUp.response.status,
    durationMs: stepUp.durationMs,
  });

  checks.push(
    await checkJson("admin-protected-authenticated", "/api/protected/admin", {
      headers: {
        cookie: cookieJar.toHeader(),
      },
      statuses: [200],
      validate(payload) {
        if (!payload.ok || payload.scope !== "admin") {
          throw new Error("Authenticated admin scope validation failed.");
        }
      },
    })
  );

  checks.push(
    await checkJson("admin-control-plane", "/api/admin/control-plane", {
      headers: {
        cookie: cookieJar.toHeader(),
      },
      statuses: [200],
      validate(payload) {
        if (!payload.summary || !payload.ops || !payload.assets) {
          throw new Error("/api/admin/control-plane returned an unexpected payload shape.");
        }
      },
    })
  );

  return checks;
}

async function runSmokeSuite() {
  const checks = [];

  const robots = await readTextResponse("/robots.txt", {
    statuses: [200],
    contains: ["Sitemap:", "/api/", "/en/search"],
  });
  checks.push({
    label: "robots",
    path: robots.path,
    status: robots.status,
    durationMs: robots.durationMs,
  });

  const sitemap = await readTextResponse("/sitemap.xml", {
    statuses: [200],
    contains: ["/en/news", "/fr/news", "/sw/news"],
  });
  checks.push({
    label: "sitemap",
    path: sitemap.path,
    status: sitemap.status,
    durationMs: sitemap.durationMs,
  });

  const searchArsenal = await checkJson("search-api-arsenal", "/api/search?q=Arsenal&locale=en&limit=6", {
    statuses: [200],
    validate(payload) {
      if (!payload.summary || !payload.sections || !Array.isArray(payload.topResults)) {
        throw new Error("/api/search returned an unexpected payload shape.");
      }
    },
  });
  checks.push(searchArsenal);

  const searchCompetition = await checkJson(
    "search-api-competition",
    "/api/search?q=Premier&locale=en&limit=6",
    {
      statuses: [200],
      validate(payload) {
        if (!payload.summary || !payload.sections || !Array.isArray(payload.topResults)) {
          throw new Error("/api/search returned an unexpected payload shape.");
        }
      },
    }
  );
  checks.push(searchCompetition);

  const health = await checkJson("health-api", "/api/health", {
    statuses: [200, 503],
    validate(payload) {
      if (!payload.status || !payload.release) {
        throw new Error("/api/health returned an unexpected payload shape.");
      }

      if (payload.status === "ok" && !Array.isArray(payload.providerChain)) {
        throw new Error("/api/health returned an unexpected provider chain.");
      }
    },
  });
  checks.push(health);

  checks.push(
    await checkText("scores-home", "/en", {
      statuses: [200],
      containsAny: ["Scores", "Open live board"],
    })
  );

  checks.push(
    await checkText("live-date-filter", `/en/live?date=${encodeURIComponent(SMOKE_DATE)}`, {
      statuses: [200],
      contains: ["Previous day", "Next day"],
    })
  );

  checks.push(
    await checkText("news-hub", "/en/news", {
      statuses: [200],
      containsAny: ["News", "Browse all"],
    })
  );

  checks.push(
    await checkText("search-page", "/en/search?q=arsenal", {
      statuses: [200],
      contains: ["noindex", "follow"],
    })
  );

  checks.push(
    await checkText("favorites-page", "/en/favorites", {
      statuses: [200],
      containsAny: ["Favorites", "Saved competitions", "Save a competition"],
    })
  );

  checks.push(
    await checkText("admin-page", "/en/admin", {
      statuses: [200],
      containsAny: ["Admin Control Room", "Administrator access is required"],
    })
  );

  const sitemapUrls = extractSitemapUrls(sitemap.body);
  const discoveredRoutes = {
    competition:
      normalizeRouteFromHref(pickSearchHref(searchCompetition.payload, "competitions", "competition")) ||
      normalizeRouteFromHref(firstMatchingUrl(sitemapUrls, /\/en\/leagues\/[^/]+$/)),
    team:
      normalizeRouteFromHref(pickSearchHref(searchArsenal.payload, "teams", "team")) ||
      normalizeRouteFromHref(firstMatchingUrl(sitemapUrls, /\/en\/teams\/[^/]+$/)),
    match:
      normalizeRouteFromHref(pickSearchHref(searchArsenal.payload, "matches", "match")) ||
      normalizeRouteFromHref(firstMatchingUrl(sitemapUrls, /\/en\/match\/[^/]+$/)),
    article:
      normalizeRouteFromHref(pickSearchHref(searchArsenal.payload, "articles", "article")) ||
      normalizeRouteFromHref(firstMatchingUrl(sitemapUrls, /\/en\/news\/[^/]+$/)),
  };

  const dynamicChecks = [
    await maybeCheckDynamicText("competition-page", discoveredRoutes.competition, {
      statuses: [200],
      containsAny: ["Standings", "Overview", "Fixtures"],
    }),
    await maybeCheckDynamicText("team-page", discoveredRoutes.team, {
      statuses: [200],
      containsAny: ["Standings", "Squads", "Fixtures"],
    }),
    await maybeCheckDynamicText("match-center", discoveredRoutes.match, {
      statuses: [200],
      containsAny: ["Key events", "Timeline", "Broadcast guide"],
    }),
    await maybeCheckDynamicText("news-article", discoveredRoutes.article, {
      statuses: [200],
    }),
  ];

  const adminChecks = await runAdminChecks();

  return {
    baseUrl: BASE_URL,
    release: health.payload.release,
    checks: checks.map((entry) => ({
      label: entry.label,
      path: entry.path,
      status: entry.status,
      durationMs: entry.durationMs,
    })),
    dynamicChecks,
    adminChecks,
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
