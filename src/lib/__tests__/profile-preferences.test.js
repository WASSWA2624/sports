import { describe, expect, it } from "vitest";
import {
  getProfileComplianceSnapshot,
  mergeProfilePreferences,
  normalizeProfilePreferences,
} from "../profile-preferences";

describe("profile preferences", () => {
  it("normalizes nested preference objects safely", () => {
    const result = normalizeProfilePreferences({
      locale: "sw",
      theme: "night",
      timezone: "Africa/Kampala",
      favoriteSports: ["Football", "football", "Basketball"],
      promptPreferences: {
        reminderPrompts: true,
      },
      marketPreferences: {
        preferredGeo: "ke",
        bookmakerGeo: "ug",
      },
      onboardingState: {
        completed: true,
        completedAt: "2026-03-24T09:00:00.000Z",
      },
    });

    expect(result).toMatchObject({
      locale: "sw",
      theme: "system",
      timezone: "Africa/Kampala",
      favoriteSports: ["football", "basketball"],
      alertPreferences: {
        goals: true,
        cards: false,
        kickoff: true,
        periodChange: false,
        finalResult: true,
        news: true,
      },
      promptPreferences: {
        reminderPrompts: true,
        funnelPrompts: false,
        bookmakerPrompts: false,
      },
      marketPreferences: {
        preferredGeo: "KE",
        bookmakerGeo: "UG",
        ctaGeo: "KE",
      },
      onboardingState: {
        completed: true,
        dismissed: false,
      },
    });
  });

  it("merges local-first guest choices with remote account state", () => {
    const merged = mergeProfilePreferences(
      {
        locale: "fr",
        favoriteSports: ["football"],
        promptPreferences: {
          reminderPrompts: true,
        },
        marketPreferences: {
          preferredGeo: "UG",
          ctaGeo: "UG",
        },
      },
      {
        theme: "dark",
        favoriteSports: ["basketball"],
        promptPreferences: {
          funnelPrompts: true,
        },
      },
      {
        fallbackGeo: "UG",
      }
    );

    expect(merged).toMatchObject({
      locale: "fr",
      theme: "dark",
      favoriteSports: ["football", "basketball"],
      promptPreferences: {
        reminderPrompts: true,
        funnelPrompts: true,
        bookmakerPrompts: false,
      },
      alertPreferences: {
        news: true,
      },
      marketPreferences: {
        preferredGeo: "UG",
        ctaGeo: "UG",
      },
    });
  });

  it("derives compliance state from market preferences and viewer geo", () => {
    const compliance = getProfileComplianceSnapshot(
      {
        marketPreferences: {
          preferredGeo: "KE",
          bookmakerGeo: "UG",
          ctaGeo: "KE",
        },
      },
      {
        viewerGeo: "INTL",
      }
    );

    expect(compliance).toEqual({
      viewerGeo: "INTL",
      effectiveGeo: "KE",
      ctaGeo: "KE",
      bookmakerGeo: "UG",
      promptOptInAllowed: true,
      bookmakerPromptAllowed: true,
      regulatedCopyRequired: true,
    });
  });
});
