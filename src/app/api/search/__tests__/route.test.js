import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const buildDegradedSearchResult = vi.fn((query) => ({
  query,
  degraded: true,
  topResults: [],
  sections: {
    competitions: [],
    teams: [],
    matches: [],
    players: [],
    articles: [],
  },
  summary: {
    total: 0,
    counts: {
      competitions: 0,
      teams: 0,
      matches: 0,
      players: 0,
      articles: 0,
    },
  },
}));
const normalizeSearchQuery = vi.fn((query) => String(query || "").trim().toLowerCase());
const searchGlobal = vi.fn();
const observeOperation = vi.fn((_context, task) => task());
const recordOperationalEvent = vi.fn();

vi.mock("../../../../lib/coreui/search", () => ({
  buildDegradedSearchResult,
  normalizeSearchQuery,
  searchGlobal,
}));

vi.mock("../../../../lib/operations", () => ({
  observeOperation,
  recordOperationalEvent,
}));

const { GET } = await import("../route.js");

describe("GET /api/search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns successful search payloads with a clamped limit", async () => {
    searchGlobal.mockResolvedValue({
      query: "arsenal",
      degraded: false,
      topResults: [],
      sections: {
        competitions: [],
        teams: [],
        matches: [],
        players: [],
        articles: [],
      },
      summary: {
        total: 0,
        counts: {
          competitions: 0,
          teams: 0,
          matches: 0,
          players: 0,
          articles: 0,
        },
      },
    });

    const response = await GET(
      new NextRequest("http://localhost/api/search?q=Arsenal&locale=fr&limit=99")
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.query).toBe("arsenal");
    expect(searchGlobal).toHaveBeenCalledWith("Arsenal", {
      locale: "fr",
      limitPerSection: 12,
    });
    expect(observeOperation).toHaveBeenCalledTimes(1);
  });

  it("falls back to degraded mode when search errors", async () => {
    searchGlobal.mockRejectedValue(new Error("Search unavailable"));

    const response = await GET(
      new NextRequest("http://localhost/api/search?q=Arsenal&locale=en&limit=4")
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("x-search-mode")).toBe("degraded");
    expect(payload).toMatchObject({
      query: "arsenal",
      degraded: true,
    });
    expect(buildDegradedSearchResult).toHaveBeenCalledWith("arsenal");
    expect(recordOperationalEvent).toHaveBeenCalledTimes(1);
  });
});
