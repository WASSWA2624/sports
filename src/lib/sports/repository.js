import { db } from "../db";

const PROVIDER_CODE = "SPORTSMONKS";
const DEFAULT_SPORT = {
  code: "football",
  slug: "football",
  name: "Football",
};

function isTerminalStatus(status) {
  return ["FINISHED", "POSTPONED", "CANCELLED"].includes(status);
}

function toStringOrNull(value) {
  return value == null ? null : String(value);
}

function decimalOrNull(value) {
  if (value == null || value === "") {
    return null;
  }

  return String(value);
}

function fallbackDate(value) {
  return value || new Date("2000-01-01T00:00:00.000Z");
}

function slugify(value, fallback = "entity") {
  const normalized = String(value || fallback)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || fallback;
}

function toCountryCode(value) {
  return slugify(value, "international").replace(/-/g, "_").toUpperCase().slice(0, 24);
}

async function ensureSourceProvider(tx) {
  return tx.sourceProvider.upsert({
    where: { code: PROVIDER_CODE },
    update: {
      name: "SportsMonks",
      kind: "football-feed",
      isActive: true,
    },
    create: {
      code: PROVIDER_CODE,
      name: "SportsMonks",
      kind: "football-feed",
      isActive: true,
    },
  });
}

async function ensureSport(tx) {
  return tx.sport.upsert({
    where: { code: DEFAULT_SPORT.code },
    update: {
      slug: DEFAULT_SPORT.slug,
      name: DEFAULT_SPORT.name,
      isEnabled: true,
    },
    create: {
      code: DEFAULT_SPORT.code,
      slug: DEFAULT_SPORT.slug,
      name: DEFAULT_SPORT.name,
      isEnabled: true,
    },
  });
}

async function ensureCountry(tx, countryName) {
  if (!countryName) {
    return null;
  }

  return tx.country.upsert({
    where: { code: toCountryCode(countryName) },
    update: {
      slug: slugify(countryName),
      name: countryName,
    },
    create: {
      code: toCountryCode(countryName),
      slug: slugify(countryName),
      name: countryName,
    },
  });
}

async function ensureCompetition(tx, league, sportId, countryId) {
  if (!league) {
    return null;
  }

  const basePayload = {
    sportId,
    countryId,
    name: league.name,
    shortName: league.code || league.name,
    slug: slugify(`${league.country || "international"}-${league.code || league.name}`),
    code: league.code,
    logoUrl: league.logoUrl,
    metadata: league.metadata,
  };

  if (league.externalRef) {
    return tx.competition.upsert({
      where: { externalRef: league.externalRef },
      update: {
        ...basePayload,
        externalRef: league.externalRef,
      },
      create: {
        ...basePayload,
        externalRef: league.externalRef,
      },
    });
  }

  return tx.competition.upsert({
    where: { slug: basePayload.slug },
    update: basePayload,
    create: basePayload,
  });
}

async function ensureLeague(tx, league, links) {
  if (!league) {
    return null;
  }

  const basePayload = {
    provider: PROVIDER_CODE,
    sportId: links.sportId,
    countryId: links.countryId,
    competitionId: links.competitionId,
    name: league.name,
    country: league.country,
    code: league.code,
    logoUrl: league.logoUrl,
    metadata: league.metadata,
    isActive: true,
  };

  if (league.externalRef) {
    return tx.league.upsert({
      where: { externalRef: league.externalRef },
      update: {
        ...basePayload,
        externalRef: league.externalRef,
      },
      create: {
        ...basePayload,
        externalRef: league.externalRef,
      },
    });
  }

  return tx.league.upsert({
    where: { code: league.code },
    update: basePayload,
    create: basePayload,
  });
}

async function ensureSeason(tx, season, leagueId, competitionId) {
  if (!season) {
    return null;
  }

  const basePayload = {
    provider: PROVIDER_CODE,
    leagueId,
    competitionId,
    name: season.name,
    startDate: fallbackDate(season.startDate),
    endDate: fallbackDate(season.endDate || season.startDate),
    isCurrent: season.isCurrent,
    metadata: season.metadata,
  };

  if (season.externalRef) {
    return tx.season.upsert({
      where: { externalRef: season.externalRef },
      update: {
        ...basePayload,
        externalRef: season.externalRef,
      },
      create: {
        ...basePayload,
        externalRef: season.externalRef,
      },
    });
  }

  return tx.season.upsert({
    where: {
      leagueId_name: {
        leagueId,
        name: season.name,
      },
    },
    update: basePayload,
    create: basePayload,
  });
}

async function ensureTeam(tx, team, leagueId, competitionId) {
  if (!team) {
    return null;
  }

  const basePayload = {
    provider: PROVIDER_CODE,
    leagueId,
    competitionId,
    name: team.name,
    shortName: team.shortName,
    code: team.code,
    logoUrl: team.logoUrl,
    metadata: team.metadata,
  };

  if (team.externalRef) {
    return tx.team.upsert({
      where: { externalRef: team.externalRef },
      update: {
        ...basePayload,
        externalRef: team.externalRef,
      },
      create: {
        ...basePayload,
        externalRef: team.externalRef,
      },
    });
  }

  return tx.team.upsert({
    where: {
      leagueId_name: {
        leagueId,
        name: team.name,
      },
    },
    update: basePayload,
    create: basePayload,
  });
}

async function ensureVenue(tx, venueName, venueMetadata) {
  if (!venueName) {
    return null;
  }

  const city = venueMetadata?.venue?.city_name || venueMetadata?.venue?.city || null;
  const countryName = venueMetadata?.venue?.country_name || null;
  const capacityValue = venueMetadata?.venue?.capacity;
  const capacity = Number.isFinite(Number(capacityValue)) ? Number(capacityValue) : null;
  const existing = await tx.venue.findFirst({
    where: {
      name: venueName,
      city,
    },
  });

  if (existing) {
    return tx.venue.update({
      where: { id: existing.id },
      data: {
        countryName,
        capacity,
        metadata: venueMetadata?.venue || null,
      },
    });
  }

  return tx.venue.create({
    data: {
      name: venueName,
      city,
      countryName,
      capacity,
      metadata: venueMetadata?.venue || null,
    },
  });
}

async function replaceFixtureParticipants(tx, storedFixture, homeTeam, awayTeam) {
  await tx.fixtureParticipant.deleteMany({
    where: { fixtureId: storedFixture.id },
  });

  await tx.fixtureParticipant.createMany({
    data: [
      {
        fixtureId: storedFixture.id,
        teamId: homeTeam.id,
        type: "TEAM",
        side: "HOME",
        role: "team",
        sortOrder: 1,
      },
      {
        fixtureId: storedFixture.id,
        teamId: awayTeam.id,
        type: "TEAM",
        side: "AWAY",
        role: "team",
        sortOrder: 2,
      },
    ],
  });
}

export async function persistFixtureBatch(fixtures) {
  let processed = 0;

  for (const fixture of fixtures) {
    await db.$transaction(async (tx) => {
      await ensureSourceProvider(tx);
      const sport = await ensureSport(tx);
      const country = await ensureCountry(tx, fixture.league?.country);
      const competition = await ensureCompetition(tx, fixture.league, sport.id, country?.id || null);
      const league = await ensureLeague(tx, fixture.league, {
        sportId: sport.id,
        countryId: country?.id || null,
        competitionId: competition?.id || null,
      });
      const season = await ensureSeason(tx, fixture.season, league.id, competition?.id || null);
      const homeTeam = await ensureTeam(tx, fixture.homeTeam, league.id, competition?.id || null);
      const awayTeam = await ensureTeam(tx, fixture.awayTeam, league.id, competition?.id || null);
      const venue = await ensureVenue(tx, fixture.venue, fixture.metadata);

      const existingFixture = fixture.externalRef
        ? await tx.fixture.findUnique({
            where: { externalRef: fixture.externalRef },
            include: { resultSnapshot: true },
          })
        : null;

      const storedFixture = await tx.fixture.upsert({
        where: { externalRef: fixture.externalRef },
        update: {
          provider: PROVIDER_CODE,
          sportId: sport.id,
          countryId: country?.id || null,
          competitionId: competition?.id || null,
          leagueId: league.id,
          seasonId: season.id,
          venueId: venue?.id || null,
          homeTeamId: homeTeam.id,
          awayTeamId: awayTeam.id,
          startsAt: fixture.startsAt || new Date(),
          status: fixture.status,
          venue: fixture.venue,
          round: fixture.round,
          stateReason: fixture.stateReason,
          lastSyncedAt: new Date(),
          metadata: fixture.metadata,
        },
        create: {
          provider: PROVIDER_CODE,
          externalRef: fixture.externalRef,
          sportId: sport.id,
          countryId: country?.id || null,
          competitionId: competition?.id || null,
          leagueId: league.id,
          seasonId: season.id,
          venueId: venue?.id || null,
          homeTeamId: homeTeam.id,
          awayTeamId: awayTeam.id,
          startsAt: fixture.startsAt || new Date(),
          status: fixture.status,
          venue: fixture.venue,
          round: fixture.round,
          stateReason: fixture.stateReason,
          lastSyncedAt: new Date(),
          metadata: fixture.metadata,
        },
      });

      await replaceFixtureParticipants(tx, storedFixture, homeTeam, awayTeam);

      const shouldKeepFrozenSnapshot =
        existingFixture?.resultSnapshot &&
        isTerminalStatus(existingFixture.status) &&
        existingFixture.status === fixture.status;

      if (!shouldKeepFrozenSnapshot) {
        await tx.resultSnapshot.upsert({
          where: { fixtureId: storedFixture.id },
          update: {
            homeScore: fixture.resultSnapshot.homeScore,
            awayScore: fixture.resultSnapshot.awayScore,
            statusText: fixture.resultSnapshot.statusText,
            payload: fixture.resultSnapshot.payload,
            capturedAt: new Date(),
          },
          create: {
            fixtureId: storedFixture.id,
            homeScore: fixture.resultSnapshot.homeScore,
            awayScore: fixture.resultSnapshot.awayScore,
            statusText: fixture.resultSnapshot.statusText,
            payload: fixture.resultSnapshot.payload,
            capturedAt: new Date(),
          },
        });
      }
    });

    processed += 1;
  }

  return processed;
}

export async function persistTeamBatch(teams, seasonExternalRef) {
  if (!teams.length) {
    return 0;
  }

  const season = await db.season.findUnique({
    where: { externalRef: toStringOrNull(seasonExternalRef) },
  });

  if (!season) {
    throw new Error(`Season ${seasonExternalRef} must exist before syncing teams.`);
  }

  let processed = 0;
  for (const team of teams) {
    await db.$transaction(async (tx) => {
      await ensureTeam(tx, team, season.leagueId, season.competitionId);
    });
    processed += 1;
  }

  return processed;
}

export async function persistStandingsBatch(standings) {
  let processed = 0;

  for (const standing of standings) {
    await db.$transaction(async (tx) => {
      const season = await tx.season.findUnique({
        where: { externalRef: standing.seasonExternalRef },
      });

      if (!season) {
        throw new Error(`Season ${standing.seasonExternalRef} must exist before standings sync.`);
      }

      const team = await ensureTeam(tx, standing.team, season.leagueId, season.competitionId);

      await tx.standing.upsert({
        where: {
          seasonId_teamId: {
            seasonId: season.id,
            teamId: team.id,
          },
        },
        update: {
          competitionId: season.competitionId,
          position: standing.position,
          played: standing.played,
          won: standing.won,
          drawn: standing.drawn,
          lost: standing.lost,
          goalsFor: standing.goalsFor,
          goalsAgainst: standing.goalsAgainst,
          points: standing.points,
        },
        create: {
          seasonId: season.id,
          competitionId: season.competitionId,
          teamId: team.id,
          position: standing.position,
          played: standing.played,
          won: standing.won,
          drawn: standing.drawn,
          lost: standing.lost,
          goalsFor: standing.goalsFor,
          goalsAgainst: standing.goalsAgainst,
          points: standing.points,
        },
      });
    });

    processed += 1;
  }

  return processed;
}

async function upsertOddsMarket(tx, fixtureId, market) {
  if (market.externalRef) {
    return tx.oddsMarket.upsert({
      where: { externalRef: market.externalRef },
      update: {
        provider: PROVIDER_CODE,
        fixtureId,
        bookmaker: market.bookmaker,
        marketType: market.marketType,
        suspended: market.suspended,
        lastSyncedAt: new Date(),
        metadata: market.metadata,
      },
      create: {
        provider: PROVIDER_CODE,
        externalRef: market.externalRef,
        fixtureId,
        bookmaker: market.bookmaker,
        marketType: market.marketType,
        suspended: market.suspended,
        lastSyncedAt: new Date(),
        metadata: market.metadata,
      },
    });
  }

  const existing = await tx.oddsMarket.findFirst({
    where: {
      fixtureId,
      bookmaker: market.bookmaker,
      marketType: market.marketType,
    },
  });

  if (existing) {
    return tx.oddsMarket.update({
      where: { id: existing.id },
      data: {
        suspended: market.suspended,
        lastSyncedAt: new Date(),
        metadata: market.metadata,
      },
    });
  }

  return tx.oddsMarket.create({
    data: {
      fixtureId,
      provider: PROVIDER_CODE,
      bookmaker: market.bookmaker,
      marketType: market.marketType,
      suspended: market.suspended,
      lastSyncedAt: new Date(),
      metadata: market.metadata,
    },
  });
}

export async function persistOddsBatch(markets) {
  let processed = 0;

  for (const market of markets) {
    await db.$transaction(async (tx) => {
      const fixture = await tx.fixture.findUnique({
        where: { externalRef: market.fixtureExternalRef },
      });

      if (!fixture) {
        throw new Error(`Fixture ${market.fixtureExternalRef} must exist before odds sync.`);
      }

      const storedMarket = await upsertOddsMarket(tx, fixture.id, market);

      for (const selection of market.selections) {
        if (selection.externalRef) {
          await tx.oddsSelection.upsert({
            where: { externalRef: selection.externalRef },
            update: {
              oddsMarketId: storedMarket.id,
              label: selection.label,
              line: decimalOrNull(selection.line),
              priceDecimal: String(selection.priceDecimal),
              isActive: selection.isActive,
              metadata: selection.metadata,
            },
            create: {
              externalRef: selection.externalRef,
              oddsMarketId: storedMarket.id,
              label: selection.label,
              line: decimalOrNull(selection.line),
              priceDecimal: String(selection.priceDecimal),
              isActive: selection.isActive,
              metadata: selection.metadata,
            },
          });
          continue;
        }

        const existing = await tx.oddsSelection.findFirst({
          where: {
            oddsMarketId: storedMarket.id,
            label: selection.label,
            line: decimalOrNull(selection.line),
          },
        });

        if (existing) {
          await tx.oddsSelection.update({
            where: { id: existing.id },
            data: {
              priceDecimal: String(selection.priceDecimal),
              isActive: selection.isActive,
              metadata: selection.metadata,
            },
          });
          continue;
        }

        await tx.oddsSelection.create({
          data: {
            oddsMarketId: storedMarket.id,
            label: selection.label,
            line: decimalOrNull(selection.line),
            priceDecimal: String(selection.priceDecimal),
            isActive: selection.isActive,
            metadata: selection.metadata,
          },
        });
      }
    });

    processed += 1;
  }

  return processed;
}
