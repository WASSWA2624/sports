import { describe, expect, it } from "vitest";
import {
  buildArticleQualitySignal,
  decorateNewsArticle,
  groupNewsHubArticles,
  slugifyArticleTitle,
} from "../news";

function buildArticle(overrides = {}) {
  return decorateNewsArticle({
    id: "article-1",
    slug: "arsenal-title-race",
    title: "Arsenal keep pressure on the title race",
    excerpt: "Arsenal stay within touching distance after another controlled home win.",
    body: [
      "Arsenal controlled the tempo well after the opening spell and limited Chelsea's transitions.",
      "That control matters because the final weeks now look like a sequence of emotional swings as much as tactical ones.",
      "Keeping the middle of the pitch calm is what gives them a credible route through the run-in.",
    ].join(" "),
    status: "PUBLISHED",
    publishedAt: "2026-03-24T08:00:00.000Z",
    imageUrl: "/window.svg",
    category: {
      id: "category-1",
      slug: "title-race",
      name: "Title Race",
    },
    metadata: {
      topicLabel: "Title race",
      hero: true,
      homepagePlacement: true,
    },
    entityLinks: [
      {
        id: "link-1",
        entityType: "SPORT",
        entityId: "sport-1",
        entity: { id: "sport-1", name: "Football", code: "football" },
      },
      {
        id: "link-2",
        entityType: "COMPETITION",
        entityId: "competition-1",
        entity: { id: "competition-1", name: "Premier League", shortName: "EPL" },
      },
      {
        id: "link-3",
        entityType: "TEAM",
        entityId: "team-1",
        entity: { id: "team-1", name: "Arsenal", shortName: "ARS" },
      },
    ],
    ...overrides,
  });
}

describe("news helpers", () => {
  it("slugifies article titles safely", () => {
    expect(slugifyArticleTitle("Arsenal keep pressure on the title race!")).toBe(
      "arsenal-keep-pressure-on-the-title-race"
    );
  });

  it("flags thin article payloads for moderation review", () => {
    const quality = buildArticleQualitySignal({
      title: "Short note",
      excerpt: "",
      body: "Too brief.",
      imageUrl: "",
      status: "PUBLISHED",
      publishedAt: null,
      entities: {
        sports: [],
        competitions: [],
        teams: [],
        fixtures: [],
      },
    });

    expect(quality.state).toBe("hold");
    expect(quality.issues).toEqual(
      expect.arrayContaining([
        "Headline is too short",
        "Excerpt is missing",
        "Body is too short for a full article",
        "Entity linking is too light",
      ])
    );
  });

  it("groups decorated articles into hub sections", () => {
    const hero = buildArticle();
    const second = buildArticle({
      id: "article-2",
      slug: "chelsea-response",
      title: "Chelsea search for a response",
      metadata: {
        topicLabel: "Club watch",
        hero: false,
      },
    });

    const hub = groupNewsHubArticles([hero, second]);

    expect(hub.hero?.id).toBe(hero.id);
    expect(hub.latest).toHaveLength(1);
    expect(hub.sportGroups[0]).toMatchObject({
      sport: expect.objectContaining({ name: "Football" }),
    });
    expect(hub.topicGroups.map((group) => group.label)).toEqual(
      expect.arrayContaining(["Title race", "Club watch"])
    );
  });
});
