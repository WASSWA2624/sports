import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidateTagsWithAudit = vi.fn();

vi.mock("../../cache", () => ({
  COREUI_CACHE_TAGS: ["coreui:home", "coreui:live", "coreui:fixtures"],
  revalidateTagsWithAudit,
}));

const {
  buildSportsSyncRevalidationTags,
  revalidateSportsSyncTags,
} = await import("../sync-cache.js");

describe("sports sync cache revalidation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds core and entity cache tags for synced fixtures", () => {
    const tags = buildSportsSyncRevalidationTags({
      fixtures: [
        {
          externalRef: "fixture-1",
          league: {
            code: "EPL",
          },
        },
      ],
      fixtureRefs: ["fixture-1", "fixture-2"],
      leagueCodes: ["EPL", "UCL"],
    });

    expect(tags).toEqual([
      "coreui:home",
      "coreui:live",
      "coreui:fixtures",
      "fixture:fixture-1",
      "league:EPL",
      "fixture:fixture-2",
      "league:UCL",
    ]);
  });

  it("swallows cache revalidation failures so sync writes can still complete", async () => {
    revalidateTagsWithAudit.mockRejectedValue(new Error("cache layer unavailable"));

    await expect(
      revalidateSportsSyncTags({ fixtureRefs: ["fixture-1"] }, "sports-sync:test")
    ).resolves.toEqual([
      "coreui:home",
      "coreui:live",
      "coreui:fixtures",
      "fixture:fixture-1",
    ]);
  });
});
