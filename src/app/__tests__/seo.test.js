import { beforeEach, describe, expect, it, vi } from "vitest";

const SITE_ORIGIN = "https://sports.example";

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

  it("builds localized noindex metadata", () => {
    const metadata = buildPageMetadata("fr", "Leagues", "Football competitions", "/leagues", {
      noIndex: true,
      keywords: ["football"],
    });

    expect(metadata.alternates).toEqual({
      canonical: "/fr/leagues",
      languages: {
        en: "/en/leagues",
        fr: "/fr/leagues",
        sw: "/sw/leagues",
      },
    });
    expect(metadata.robots).toEqual({
      index: false,
      follow: true,
    });
    expect(metadata.openGraph.url).toBe("https://sports.example/fr/leagues");
  });

  it("returns crawl rules for the slim public app", () => {
    expect(robotsModule.default()).toEqual({
      rules: [
        {
          userAgent: "*",
          allow: "/",
          disallow: ["/api/"],
        },
      ],
      sitemap: "https://sports.example/sitemap.xml",
      host: "https://sports.example",
    });
  });

  it("publishes only football board routes, leagues, and matches in the sitemap", async () => {
    const entries = await sitemapModule.default();
    const urls = entries.map((entry) => entry.url);

    expect(urls).toEqual(
      expect.arrayContaining([
        "https://sports.example/en",
        "https://sports.example/en/live",
        "https://sports.example/en/fixtures",
        "https://sports.example/en/results",
        "https://sports.example/en/leagues",
        "https://sports.example/en/leagues/EPL",
        "https://sports.example/en/match/epl-live-ars-che",
      ])
    );
    expect(urls).not.toEqual(
      expect.arrayContaining([
        "https://sports.example/en/search",
        "https://sports.example/en/news",
        "https://sports.example/en/predictions",
        "https://sports.example/en/teams",
      ])
    );
  });
});
