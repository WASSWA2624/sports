import { describe, expect, it } from "vitest";
import {
  buildFavoriteChannelPanelModel,
  buildFavoriteReminderItems,
} from "../favorite-retention";

const dictionary = {
  competition: "Competition",
  match: "Match",
  teams: "Teams",
  openTelegram: "Open Telegram",
  openWhatsApp: "Open WhatsApp",
};

const favorites = {
  fixtures: [
    {
      id: "fixture-1",
      league: { name: "Premier League", code: "EPL" },
      homeTeam: { name: "Arsenal" },
      awayTeam: { name: "Chelsea" },
    },
  ],
  teams: [
    {
      id: "team-1",
      name: "Arsenal",
      league: { name: "Premier League", code: "EPL" },
    },
  ],
  competitions: [
    {
      code: "EPL",
      name: "Premier League",
      country: "England",
    },
  ],
};

describe("favorite retention", () => {
  it("builds reminder items with news support and filters already-alerted favorites", () => {
    const items = buildFavoriteReminderItems({
      favorites,
      locale: "en",
      dictionary,
      alertSettings: {
        "team:team-1": ["NEWS"],
      },
      limit: 4,
      surface: "favorites-reminders",
    });

    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      itemId: "fixture:fixture-1",
      supportedTypes: ["KICKOFF", "GOAL", "CARD", "PERIOD_CHANGE", "FINAL_RESULT", "NEWS"],
      surface: "favorites-reminders",
    });
    expect(items[1]).toMatchObject({
      itemId: "competition:EPL",
      supportedTypes: ["KICKOFF", "FINAL_RESULT", "NEWS"],
    });
  });

  it("builds favorite channel actions only for the active geo", () => {
    const panel = buildFavoriteChannelPanelModel({
      favorites,
      locale: "en",
      dictionary,
      geo: "UG",
      platform: {
        funnel: {
          actions: [
            {
              key: "telegram",
              url: "https://t.me/sports",
              enabledGeos: ["UG"],
            },
            {
              key: "whatsapp",
              url: "https://wa.me/123",
              enabledGeos: ["KE"],
            },
          ],
        },
      },
    });

    expect(panel.items).toHaveLength(3);
    expect(panel.actions).toEqual([
      {
        key: "telegram",
        href: "https://t.me/sports",
        label: "Open Telegram",
      },
    ]);
    expect(panel.geoLabel).toBe("Uganda");
  });
});
