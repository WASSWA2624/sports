import { db } from "../db";

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

async function ensureLeague(tx, league) {
  if (!league) {
    return null;
  }

  if (league.externalRef) {
    return tx.league.upsert({
      where: { externalRef: league.externalRef },
      update: {
        provider: "SPORTSMONKS",
        externalRef: league.externalRef,
        name: league.name,
        country: league.country,
        code: league.code,
        logoUrl: league.logoUrl,
        metadata: league.metadata,
        isActive: true,
      },
      create: {
        provider: "SPORTSMONKS",
        externalRef: league.externalRef,
        name: league.name,
        country: league.country,
        code: league.code,
        logoUrl: league.logoUrl,
        metadata: league.metadata,
        isActive: true,
      },
    });
  }

  return tx.league.upsert({
    where: { code: league.code },
    update: {
      provider: "SPORTSMONKS",
      name: league.name,
      country: league.country,
      logoUrl: league.logoUrl,
      metadata: league.metadata,
      isActive: true,
    },
    create: {
      provider: "SPORTSMONKS",
      name: league.name,
      country: league.country,
      code: league.code,
      logoUrl: league.logoUrl,
      metadata: league.metadata,
      isActive: true,
    },
  });
}

async function ensureSeason(tx, season, leagueId) {
  if (!season) {
    return null;
  }

  if (season.externalRef) {
    return tx.season.upsert({
      where: { externalRef: season.externalRef },
      update: {
        provider: "SPORTSMONKS",
        externalRef: season.externalRef,
        leagueId,
        name: season.name,
        startDate: fallbackDate(season.startDate),
        endDate: fallbackDate(season.endDate || season.startDate),
        isCurrent: season.isCurrent,
        metadata: season.metadata,
      },
      create: {
        provider: "SPORTSMONKS",
        externalRef: season.externalRef,
        leagueId,
        name: season.name,
        startDate: fallbackDate(season.startDate),
        endDate: fallbackDate(season.endDate || season.startDate),
        isCurrent: season.isCurrent,
        metadata: season.metadata,
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
    update: {
      provider: "SPORTSMONKS",
      startDate: fallbackDate(season.startDate),
      endDate: fallbackDate(season.endDate || season.startDate),
      isCurrent: season.isCurrent,
      metadata: season.metadata,
    },
    create: {
      provider: "SPORTSMONKS",
      leagueId,
      name: season.name,
      startDate: fallbackDate(season.startDate),
      endDate: fallbackDate(season.endDate || season.startDate),
      isCurrent: season.isCurrent,
      metadata: season.metadata,
    },
  });
}

async function ensureTeam(tx, team, leagueId) {
  if (!team) {
    return null;
  }

  if (team.externalRef) {
    return tx.team.upsert({
      where: { externalRef: team.externalRef },
      update: {
        provider: "SPORTSMONKS",
        externalRef: team.externalRef,
        leagueId,
        name: team.name,
        shortName: team.shortName,
        code: team.code,
        logoUrl: team.logoUrl,
        metadata: team.metadata,
      },
      create: {
        provider: "SPORTSMONKS",
        externalRef: team.externalRef,
        leagueId,
        name: team.name,
        shortName: team.shortName,
        code: team.code,
        logoUrl: team.logoUrl,
        metadata: team.metadata,
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
    update: {
      provider: "SPORTSMONKS",
      shortName: team.shortName,
      code: team.code,
      logoUrl: team.logoUrl,
      metadata: team.metadata,
    },
    create: {
      provider: "SPORTSMONKS",
      leagueId,
      name: team.name,
      shortName: team.shortName,
      code: team.code,
      logoUrl: team.logoUrl,
      metadata: team.metadata,
    },
  });
}

export async function persistFixtureBatch(fixtures) {
  let processed = 0;

  for (const fixture of fixtures) {
    await db.$transaction(async (tx) => {
      const existingFixture = fixture.externalRef
        ? await tx.fixture.findUnique({
            where: { externalRef: fixture.externalRef },
            include: { resultSnapshot: true },
          })
        : null;

      const league = await ensureLeague(tx, fixture.league);
      const season = await ensureSeason(tx, fixture.season, league.id);
      const homeTeam = await ensureTeam(tx, fixture.homeTeam, league.id);
      const awayTeam = await ensureTeam(tx, fixture.awayTeam, league.id);

      const storedFixture = await tx.fixture.upsert({
        where: { externalRef: fixture.externalRef },
        update: {
          provider: "SPORTSMONKS",
          leagueId: league.id,
          seasonId: season.id,
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
          provider: "SPORTSMONKS",
          externalRef: fixture.externalRef,
          leagueId: league.id,
          seasonId: season.id,
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
      await ensureTeam(tx, team, season.leagueId);
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

      const team = await ensureTeam(tx, standing.team, season.leagueId);

      await tx.standing.upsert({
        where: {
          seasonId_teamId: {
            seasonId: season.id,
            teamId: team.id,
          },
        },
        update: {
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
        provider: "SPORTSMONKS",
        fixtureId,
        bookmaker: market.bookmaker,
        marketType: market.marketType,
        suspended: market.suspended,
        lastSyncedAt: new Date(),
        metadata: market.metadata,
      },
      create: {
        provider: "SPORTSMONKS",
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
      provider: "SPORTSMONKS",
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
