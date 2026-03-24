import {
  normalizeSportsMonksFixtures,
  normalizeSportsMonksOdds,
  normalizeSportsMonksBroadcastChannels,
  normalizeSportsMonksStandings,
  normalizeSportsMonksTeams,
} from "../normalize";
import { getSportsSyncConfig, requireSportsApiKey } from "../config";

const FIXTURE_LIST_INCLUDES = "league;season;participants;state;scores;venue;round";
const FIXTURE_DETAIL_INCLUDES =
  "league;season;participants;state;scores;venue;round;events;events.type;statistics;statistics.type;lineups;formations;periods";

function buildUrl(baseUrl, path, params = {}) {
  const normalizedBase = baseUrl.replace(/\/$/, "");
  const normalizedPath = path.replace(/^\//, "");
  const url = new URL(`${normalizedBase}/${normalizedPath}`);

  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === "") {
      continue;
    }

    if (Array.isArray(value)) {
      value.forEach((entry) => url.searchParams.append(key, entry));
      continue;
    }

    url.searchParams.set(key, String(value));
  }

  return url;
}

function toDateString(date) {
  return new Date(date).toISOString().slice(0, 10);
}

export class SportsMonksProvider {
  constructor(config = null) {
    const baseConfig = getSportsSyncConfig();
    const resolvedConfig =
      config && config.apiKey && config.baseUrl
        ? {
            ...baseConfig,
            ...config,
          }
        : requireSportsApiKey();

    this.config = resolvedConfig;
  }

  async request(path, params = {}) {
    const url = buildUrl(this.config.baseUrl, path, {
      api_token: this.config.apiKey,
      ...params,
    });

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
      signal:
        Number.isFinite(this.config.timeoutMs) && this.config.timeoutMs > 0
          ? AbortSignal.timeout(this.config.timeoutMs)
          : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`SportsMonks request failed (${response.status}): ${errorText}`);
    }

    return response.json();
  }

  async fetchFixtures({ startDate, endDate }) {
    const payload = await this.request(
      `fixtures/between/${toDateString(startDate)}/${toDateString(endDate)}`,
      {
        include: FIXTURE_LIST_INCLUDES,
      }
    );

    return normalizeSportsMonksFixtures(payload.data || payload);
  }

  async fetchLivescores() {
    const payload = await this.request("livescores/inplay", {
      include: FIXTURE_DETAIL_INCLUDES,
    });

    return normalizeSportsMonksFixtures(payload.data || payload);
  }

  async fetchFixtureDetail({ fixtureExternalRef }) {
    const payload = await this.request(`fixtures/${fixtureExternalRef}`, {
      include: FIXTURE_DETAIL_INCLUDES,
    });

    const fixtures = normalizeSportsMonksFixtures(payload.data || payload);
    return fixtures[0] || null;
  }

  async fetchStandings({ seasonExternalRef }) {
    const payload = await this.request(`standings/seasons/${seasonExternalRef}`, {
      include: "participant",
    });

    return normalizeSportsMonksStandings(payload.data || payload, seasonExternalRef);
  }

  async fetchOdds({ fixtureExternalRef, bookmakerIds = [] }) {
    const payload = await this.request(`odds/pre-match/fixtures/${fixtureExternalRef}`, {
      include: "bookmaker;market;values",
      ...(bookmakerIds.length ? { filters: `bookmakerId:${bookmakerIds.join(",")}` } : {}),
    });

    return normalizeSportsMonksOdds(payload.data || payload, fixtureExternalRef);
  }

  async fetchTeams({ seasonExternalRef }) {
    const payload = await this.request(`teams/seasons/${seasonExternalRef}`);
    return normalizeSportsMonksTeams(payload.data || payload);
  }

  async fetchTaxonomy() {
    return [];
  }

  async fetchNews() {
    return [];
  }

  async fetchMediaMetadata({ fixtureExternalRef }) {
    const payload = await this.request(`tv-stations/fixtures/${fixtureExternalRef}`, {
      include: "countries",
    });

    return normalizeSportsMonksBroadcastChannels(payload.data || payload, fixtureExternalRef);
  }

  async fetchPredictions() {
    return [];
  }
}
