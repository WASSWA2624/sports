import { beforeEach, describe, expect, it, vi } from "vitest";

const SITE_ORIGIN = "https://sports.example";
const db = {
  sport: {
    findMany: vi.fn(),
  },
  league: {
    findMany: vi.fn(),
  },
  team: {
    findMany: vi.fn(),
  },
  fixture: {
    findMany: vi.fn(),
  },
  newsArticle: {
    findMany: vi.fn(),
  },
};

vi.mock("../../lib/db", () => ({
  db,
}));

vi.mock("../../lib/coreui/preferences", () => ({
  SUPPORTED_LOCALES: ["en", "fr", "sw"],
}));

vi.mock("../../lib/coreui/site", () => ({
  getSiteOrigin: () => SITE_ORIGIN,
  buildAbsoluteUrl(path = "/") {
    const normalizedPath = String(path).startsWith("/") ? path : `/${path}`;
    return new URL(normalizedPath, `${SITE_ORIGIN}/`).toString();
  },
}));

const { buildPageMetadata } = await import("../../lib/coreui/metadata.js");
const sitemapModule = await import("../sitemap.js");
const robotsModule = await import("../robots.js");

describe("SEO surfaces", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds noindex metadata with localized alternates", () => {
    const metadata = buildPageMetadata("fr", "Recherche", "Page de recherche", "/search", {
      noIndex: true,
      keywords: ["football"],
    });

    expect(metadata.alternates).toEqual({
      canonical: "/fr/search",
      languages: {
        en: "/en/search",
        fr: "/fr/search",
        sw: "/sw/search",
      },
    });
    expect(metadata.robots).toEqual({
      index: false,
      follow: true,
    });
    expect(metadata.openGraph.url).toBe("https://sports.example/fr/search");
  });

  it("returns crawl rules and sitemap location", () => {
    const robots = robotsModule.default();

    expect(robots).toEqual({
      rules: [
        {
          userAgent: "*",
          allow: "/",
          disallow: ["/api/", "/profile", "/en/search", "/fr/search", "/sw/search"],
        },
      ],
      sitemap: "https://sports.example/sitemap.xml",
      host: "https://sports.example",
    });
  });

  it("falls back to static localized routes when sitemap data is unavailable", async () => {
    db.sport.findMany.mockRejectedValue(new Error("DB offline"));
    db.league.findMany.mockResolvedValue([]);
    db.team.findMany.mockResolvedValue([]);
    db.fixture.findMany.mockResolvedValue([]);
    db.newsArticle.findMany.mockResolvedValue([]);

    const entries = await sitemapModule.default();

    expect(entries).toHaveLength(24);
    expect(entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ url: "https://sports.example/en" }),
        expect.objectContaining({ url: "https://sports.example/fr/news" }),
        expect.objectContaining({ url: "https://sports.example/sw/teams" }),
      ])
    );
  });

  it("adds dynamic entities to the sitemap when data is available", async () => {
    db.sport.findMany.mockResolvedValue([
      { slug: "football", updatedAt: new Date("2026-03-24T10:00:00.000Z") },
    ]);
    db.league.findMany.mockResolvedValue([
      {
        code: "EPL",
        updatedAt: new Date("2026-03-24T10:00:00.000Z"),
        sport: { slug: "football" },
        countryRecord: { slug: "england" },
      },
    ]);
    db.team.findMany.mockResolvedValue([
      { id: "team-1", updatedAt: new Date("2026-03-24T10:00:00.000Z") },
    ]);
    db.fixture.findMany.mockResolvedValue([
      {
        id: "fixture-1",
        externalRef: "fx-1",
        updatedAt: new Date("2026-03-24T10:00:00.000Z"),
      },
    ]);
    db.newsArticle.findMany.mockResolvedValue([
      {
        slug: "arsenal-title-race",
        updatedAt: new Date("2026-03-24T10:00:00.000Z"),
      },
    ]);

    const entries = await sitemapModule.default();
    const urls = entries.map((entry) => entry.url);

    expect(urls).toEqual(
      expect.arrayContaining([
        "https://sports.example/en/sports/football",
        "https://sports.example/en/leagues/EPL",
        "https://sports.example/en/sports/football/countries/england",
        "https://sports.example/en/teams/team-1",
        "https://sports.example/en/match/fx-1",
        "https://sports.example/en/news/arsenal-title-race",
      ])
    );
  });
});
