import { db } from "../db";
import { getProviderContext, upsertSourceProviderRecord } from "./provider-state";
import { revalidateSportsSyncTags } from "./sync-cache";

function isTerminalStatus(status) {
  return ["FINISHED", "POSTPONED", "CANCELLED"].includes(status);
}

function toStringOrNull(value) {
  return value == null ? null : String(value);
}

function normalizeStandingGroupName(value) {
  const normalized = toStringOrNull(value)?.trim();
  return normalized || "";
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

function toBookmakerCode(value) {
  return slugify(value, "bookmaker").replace(/-/g, "_").toUpperCase().slice(0, 48);
}

function buildPlayerSourceCode(player) {
  return toStringOrNull(
    player?.externalRef || [player?.name, player?.countryName].filter(Boolean).join(":")
  );
}

function mergeJsonMetadata(existingMetadata, nextMetadata) {
  const existing =
    existingMetadata && typeof existingMetadata === "object" ? existingMetadata : {};
  const next = nextMetadata && typeof nextMetadata === "object" ? nextMetadata : {};
  const merged = {
    ...existing,
    ...next,
  };

  return Object.keys(merged).length ? merged : null;
}

async function upsertProviderRef(
  tx,
  {
    providerId,
    entityType,
    entityId,
    externalRef,
    sourceCode,
    sourceName,
    feedFamily = "taxonomy",
    role,
    tier,
    metadata,
  }
) {
  const normalizedExternalRef = toStringOrNull(externalRef ?? sourceCode);

  if (!providerId || !entityId || !entityType || !normalizedExternalRef) {
    return null;
  }

  await tx.providerEntityRef.updateMany({
    where: {
      providerId,
      entityType,
      entityId,
      NOT: {
        externalRef: normalizedExternalRef,
      },
    },
    data: {
      isPrimary: false,
    },
  });

  return tx.providerEntityRef.upsert({
    where: {
      providerId_entityType_externalRef: {
        providerId,
        entityType,
        externalRef: normalizedExternalRef,
      },
    },
    update: {
      entityId,
      sourceCode: toStringOrNull(sourceCode),
      sourceName: toStringOrNull(sourceName),
      feedFamily,
      role: role || null,
      tier: tier || null,
      isPrimary: true,
      metadata: metadata || null,
    },
    create: {
      providerId,
      entityType,
      entityId,
      externalRef: normalizedExternalRef,
      sourceCode: toStringOrNull(sourceCode),
      sourceName: toStringOrNull(sourceName),
      feedFamily,
      role: role || null,
      tier: tier || null,
      isPrimary: true,
      metadata: metadata || null,
    },
  });
}

async function findEntityIdByProviderRef(tx, providerId, entityType, externalRef) {
  const normalizedExternalRef = toStringOrNull(externalRef);

  if (!providerId || !entityType || !normalizedExternalRef) {
    return null;
  }

  const ref = await tx.providerEntityRef.findUnique({
    where: {
      providerId_entityType_externalRef: {
        providerId,
        entityType,
        externalRef: normalizedExternalRef,
      },
    },
    select: {
      entityId: true,
    },
  });

  return ref?.entityId || null;
}

async function findProviderLinkedRecord(
  tx,
  modelKey,
  providerId,
  entityType,
  externalRef,
  include = undefined
) {
  const entityId = await findEntityIdByProviderRef(tx, providerId, entityType, externalRef);

  if (!entityId) {
    return null;
  }

  return tx[modelKey].findUnique({
    where: {
      id: entityId,
    },
    ...(include ? { include } : {}),
  });
}

async function ensureSourceProvider(tx, providerContext) {
  let fallbackProviderId;

  for (const fallbackProviderCode of providerContext.providerFallbackFor || []) {
    const fallbackProvider = await upsertSourceProviderRecord(
      tx,
      getProviderContext(fallbackProviderCode)
    );
    fallbackProviderId = fallbackProvider.id;
    break;
  }

  return upsertSourceProviderRecord(tx, providerContext, {
    fallbackProviderId,
  });
}

async function ensureSport(tx, providerContext, sourceProvider) {
  const sport = await tx.sport.upsert({
    where: { code: providerContext.sport.code },
    update: {
      slug: providerContext.sport.slug,
      name: providerContext.sport.name,
      isEnabled: true,
    },
    create: {
      code: providerContext.sport.code,
      slug: providerContext.sport.slug,
      name: providerContext.sport.name,
      isEnabled: true,
    },
  });

  await upsertProviderRef(tx, {
    providerId: sourceProvider.id,
    entityType: "SPORT",
    entityId: sport.id,
    sourceCode: providerContext.sport.code,
    sourceName: providerContext.sport.name,
    feedFamily: "taxonomy",
    role: providerContext.providerRole,
    tier: providerContext.providerTier,
  });

  return sport;
}

async function ensureCountry(tx, countryName, sourceProvider, providerContext) {
  if (!countryName) {
    return null;
  }

  const country = await tx.country.upsert({
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

  await upsertProviderRef(tx, {
    providerId: sourceProvider.id,
    entityType: "COUNTRY",
    entityId: country.id,
    sourceCode: country.code,
    sourceName: country.name,
    feedFamily: "taxonomy",
    role: providerContext.providerRole,
    tier: providerContext.providerTier,
  });

  return country;
}

async function ensureCompetition(tx, league, sportId, countryId, sourceProvider, providerContext) {
  if (!league) {
    return null;
  }

  const basePayload = {
    sportId,
    countryId,
    name: league.name,
    shortName: toStringOrNull(league.code || league.name),
    slug: slugify(`${league.country || "international"}-${league.code || league.name}`),
    code: toStringOrNull(league.code),
    logoUrl: league.logoUrl,
    metadata: league.metadata,
  };

  const providerLookupRef = toStringOrNull(league.externalRef || league.code);
  let competition = providerLookupRef
    ? await findProviderLinkedRecord(
        tx,
        "competition",
        sourceProvider.id,
        "COMPETITION",
        providerLookupRef
      )
    : null;

  if (!competition && league.externalRef) {
    competition = await tx.competition.findUnique({
      where: { externalRef: league.externalRef },
    });
  }

  if (!competition) {
    competition = await tx.competition.findUnique({
      where: { slug: basePayload.slug },
    });
  }

  const storedCompetition = competition
    ? await tx.competition.update({
        where: { id: competition.id },
        data: {
          ...basePayload,
          ...(league.externalRef && !competition.externalRef
            ? { externalRef: league.externalRef }
            : {}),
        },
      })
    : await tx.competition.create({
        data: {
          ...basePayload,
          externalRef: league.externalRef,
        },
      });

  await upsertProviderRef(tx, {
    providerId: sourceProvider.id,
    entityType: "COMPETITION",
    entityId: storedCompetition.id,
    externalRef: league.externalRef,
    sourceCode: league.code,
    sourceName: league.name,
    feedFamily: "taxonomy",
    role: providerContext.providerRole,
    tier: providerContext.providerTier,
    metadata: league.metadata,
  });

  return storedCompetition;
}

async function ensureLeague(tx, league, links, sourceProvider, providerContext) {
  if (!league) {
    return null;
  }

  const basePayload = {
    provider: providerContext.providerCode,
    sportId: links.sportId,
    countryId: links.countryId,
    competitionId: links.competitionId,
    name: league.name,
    country: league.country,
    code: toStringOrNull(league.code),
    logoUrl: league.logoUrl,
    metadata: league.metadata,
    isActive: true,
  };

  const providerLookupRef = toStringOrNull(league.externalRef || league.code);
  let existingLeague = providerLookupRef
    ? await findProviderLinkedRecord(tx, "league", sourceProvider.id, "LEAGUE", providerLookupRef)
    : null;

  if (!existingLeague && league.externalRef) {
    existingLeague = await tx.league.findUnique({
      where: { externalRef: league.externalRef },
    });
  }

  if (!existingLeague) {
    existingLeague = await tx.league.findUnique({
      where: { code: toStringOrNull(league.code) },
    });
  }

  const storedLeague = existingLeague
    ? await tx.league.update({
        where: { id: existingLeague.id },
        data: {
          ...basePayload,
          ...(league.externalRef && !existingLeague.externalRef
            ? { externalRef: league.externalRef }
            : {}),
        },
      })
    : await tx.league.create({
        data: {
          ...basePayload,
          externalRef: league.externalRef,
        },
      });

  await upsertProviderRef(tx, {
    providerId: sourceProvider.id,
    entityType: "LEAGUE",
    entityId: storedLeague.id,
    externalRef: league.externalRef,
    sourceCode: league.code,
    sourceName: league.name,
    feedFamily: "taxonomy",
    role: providerContext.providerRole,
    tier: providerContext.providerTier,
    metadata: league.metadata,
  });

  return storedLeague;
}

async function ensureSeason(tx, season, leagueId, competitionId, sourceProvider, providerContext) {
  if (!season) {
    return null;
  }

  const basePayload = {
    provider: providerContext.providerCode,
    leagueId,
    competitionId,
    name: season.name,
    startDate: fallbackDate(season.startDate),
    endDate: fallbackDate(season.endDate || season.startDate),
    isCurrent: season.isCurrent,
    metadata: season.metadata,
  };

  const providerLookupRef = toStringOrNull(season.externalRef || season.name);
  let existingSeason = providerLookupRef
    ? await findProviderLinkedRecord(tx, "season", sourceProvider.id, "SEASON", providerLookupRef)
    : null;

  if (!existingSeason && season.externalRef) {
    existingSeason = await tx.season.findUnique({
      where: { externalRef: season.externalRef },
    });
  }

  if (!existingSeason) {
    existingSeason = await tx.season.findUnique({
      where: {
        leagueId_name: {
          leagueId,
          name: season.name,
        },
      },
    });
  }

  const storedSeason = existingSeason
    ? await tx.season.update({
        where: { id: existingSeason.id },
        data: {
          ...basePayload,
          ...(season.externalRef && !existingSeason.externalRef
            ? { externalRef: season.externalRef }
            : {}),
        },
      })
    : await tx.season.create({
        data: {
          ...basePayload,
          externalRef: season.externalRef,
        },
      });

  await upsertProviderRef(tx, {
    providerId: sourceProvider.id,
    entityType: "SEASON",
    entityId: storedSeason.id,
    externalRef: season.externalRef,
    sourceCode: season.name,
    sourceName: season.name,
    feedFamily: "taxonomy",
    role: providerContext.providerRole,
    tier: providerContext.providerTier,
    metadata: season.metadata,
  });

  return storedSeason;
}

async function ensureTeam(tx, team, leagueId, competitionId, sourceProvider, providerContext) {
  if (!team) {
    return null;
  }

  const basePayload = {
    provider: providerContext.providerCode,
    leagueId,
    competitionId,
    name: team.name,
    shortName: toStringOrNull(team.shortName),
    code: toStringOrNull(team.code),
    logoUrl: team.logoUrl,
    metadata: team.metadata,
  };

  const providerLookupRef = toStringOrNull(team.externalRef || team.code || team.name);
  let existingTeam = providerLookupRef
    ? await findProviderLinkedRecord(tx, "team", sourceProvider.id, "TEAM", providerLookupRef)
    : null;

  if (!existingTeam && team.externalRef) {
    existingTeam = await tx.team.findUnique({
      where: { externalRef: team.externalRef },
    });
  }

  if (!existingTeam) {
    existingTeam = await tx.team.findUnique({
      where: {
        leagueId_name: {
          leagueId,
          name: team.name,
        },
      },
    });
  }

  const storedTeam = existingTeam
    ? await tx.team.update({
        where: { id: existingTeam.id },
        data: {
          ...basePayload,
          ...(team.externalRef && !existingTeam.externalRef
            ? { externalRef: team.externalRef }
            : {}),
        },
      })
    : await tx.team.create({
        data: {
          ...basePayload,
          externalRef: team.externalRef,
        },
      });

  await upsertProviderRef(tx, {
    providerId: sourceProvider.id,
    entityType: "TEAM",
    entityId: storedTeam.id,
    externalRef: team.externalRef,
    sourceCode: team.code || team.name,
    sourceName: team.name,
    feedFamily: "taxonomy",
    role: providerContext.providerRole,
    tier: providerContext.providerTier,
    metadata: team.metadata,
  });

  return storedTeam;
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

async function ensurePlayer(tx, player, sourceProvider, providerContext) {
  const providerLookupRef = buildPlayerSourceCode(player);
  const playerName = toStringOrNull(player?.name);

  if (!providerLookupRef && !playerName) {
    return null;
  }

  let existingPlayer = providerLookupRef
    ? await findProviderLinkedRecord(tx, "player", sourceProvider.id, "PLAYER", providerLookupRef)
    : null;

  if (!existingPlayer && player?.externalRef) {
    existingPlayer = await tx.player.findUnique({
      where: { externalRef: player.externalRef },
    });
  }

  if (!existingPlayer && playerName) {
    existingPlayer = await tx.player.findFirst({
      where: {
        name: playerName,
        ...(player?.countryName ? { countryName: player.countryName } : {}),
      },
    });
  }

  const basePayload = {
    name: playerName || "Unknown Player",
    shortName: toStringOrNull(player?.shortName),
    countryName: toStringOrNull(player?.countryName),
    metadata: player?.metadata || null,
  };

  const storedPlayer = existingPlayer
    ? await tx.player.update({
        where: { id: existingPlayer.id },
        data: {
          ...basePayload,
          ...(player?.externalRef && !existingPlayer.externalRef
            ? { externalRef: player.externalRef }
            : {}),
        },
      })
    : await tx.player.create({
        data: {
          ...basePayload,
          externalRef: toStringOrNull(player?.externalRef),
        },
      });

  await upsertProviderRef(tx, {
    providerId: sourceProvider.id,
    entityType: "PLAYER",
    entityId: storedPlayer.id,
    externalRef: toStringOrNull(player?.externalRef),
    sourceCode: providerLookupRef,
    sourceName: storedPlayer.name,
    feedFamily: "fixture-detail",
    role: providerContext.providerRole,
    tier: providerContext.providerTier,
    metadata: player?.metadata,
  });

  return storedPlayer;
}

async function ensureStage(tx, stage, competitionId, seasonId, sourceProvider, providerContext) {
  if (!stage || !competitionId) {
    return null;
  }

  const slug = slugify(stage.name || stage.code || stage.externalRef || "stage");
  const providerLookupRef = toStringOrNull(stage.externalRef || stage.code || stage.name);
  let existingStage = providerLookupRef
    ? await findProviderLinkedRecord(tx, "stage", sourceProvider.id, "STAGE", providerLookupRef)
    : null;

  if (!existingStage && stage.externalRef) {
    existingStage = await tx.stage.findUnique({
      where: { externalRef: stage.externalRef },
    });
  }

  if (!existingStage) {
    existingStage = await tx.stage.findFirst({
      where: {
        competitionId,
        seasonId: seasonId || null,
        slug,
      },
    });
  }

  const basePayload = {
    competitionId,
    seasonId,
    name: toStringOrNull(stage.name || stage.code) || "Stage",
    slug,
    code: toStringOrNull(stage.code),
    stageType: stage.stageType || null,
    status: stage.status || null,
    sortOrder: Number.isFinite(Number(stage.sortOrder)) ? Number(stage.sortOrder) : 0,
    metadata: stage.metadata || null,
  };

  const storedStage = existingStage
    ? await tx.stage.update({
        where: { id: existingStage.id },
        data: {
          ...basePayload,
          ...(stage.externalRef && !existingStage.externalRef
            ? { externalRef: stage.externalRef }
            : {}),
        },
      })
    : await tx.stage.create({
        data: {
          ...basePayload,
          externalRef: stage.externalRef,
        },
      });

  await upsertProviderRef(tx, {
    providerId: sourceProvider.id,
    entityType: "STAGE",
    entityId: storedStage.id,
    externalRef: stage.externalRef,
    sourceCode: stage.code || stage.name,
    sourceName: storedStage.name,
    feedFamily: "taxonomy",
    role: providerContext.providerRole,
    tier: providerContext.providerTier,
    metadata: stage.metadata,
  });

  return storedStage;
}

async function ensureRound(
  tx,
  round,
  competitionId,
  seasonId,
  stageId,
  sourceProvider,
  providerContext
) {
  if (!round || !competitionId) {
    return null;
  }

  const slug = slugify(round.name || round.code || round.externalRef || "round");
  const providerLookupRef = toStringOrNull(round.externalRef || round.code || round.name);
  let existingRound = providerLookupRef
    ? await findProviderLinkedRecord(tx, "round", sourceProvider.id, "ROUND", providerLookupRef)
    : null;

  if (!existingRound && round.externalRef) {
    existingRound = await tx.round.findUnique({
      where: { externalRef: round.externalRef },
    });
  }

  if (!existingRound) {
    existingRound = await tx.round.findFirst({
      where: {
        competitionId,
        seasonId: seasonId || null,
        slug,
      },
    });
  }

  const basePayload = {
    competitionId,
    seasonId,
    stageId,
    name: toStringOrNull(round.name || round.code) || "Round",
    slug,
    code: toStringOrNull(round.code),
    roundType: round.roundType || null,
    sequence: Number.isFinite(Number(round.sequence)) ? Number(round.sequence) : null,
    startsAt: fallbackDate(round.startsAt || null),
    endsAt: round.endsAt || null,
    isCurrent: Boolean(round.isCurrent),
    metadata: round.metadata || null,
  };

  if (basePayload.startsAt && !round.startsAt) {
    basePayload.startsAt = null;
  }

  const storedRound = existingRound
    ? await tx.round.update({
        where: { id: existingRound.id },
        data: {
          ...basePayload,
          ...(round.externalRef && !existingRound.externalRef
            ? { externalRef: round.externalRef }
            : {}),
        },
      })
    : await tx.round.create({
        data: {
          ...basePayload,
          externalRef: round.externalRef,
        },
      });

  await upsertProviderRef(tx, {
    providerId: sourceProvider.id,
    entityType: "ROUND",
    entityId: storedRound.id,
    externalRef: round.externalRef,
    sourceCode: round.code || round.name,
    sourceName: storedRound.name,
    feedFamily: "taxonomy",
    role: providerContext.providerRole,
    tier: providerContext.providerTier,
    metadata: round.metadata,
  });

  return storedRound;
}

async function ensureBookmaker(tx, bookmaker, sourceProvider, providerContext) {
  if (!bookmaker?.name) {
    return null;
  }

  const code = toBookmakerCode(bookmaker.code || bookmaker.name);
  const slug = slugify(bookmaker.slug || bookmaker.name, "bookmaker");
  const providerLookupRef = toStringOrNull(bookmaker.externalRef || bookmaker.code || bookmaker.name);
  let existingBookmaker = providerLookupRef
    ? await findProviderLinkedRecord(
        tx,
        "bookmaker",
        sourceProvider.id,
        "BOOKMAKER",
        providerLookupRef
      )
    : null;

  if (!existingBookmaker) {
    existingBookmaker = await tx.bookmaker.findFirst({
      where: {
        OR: [{ code }, { slug }],
      },
    });
  }

  const basePayload = {
    sourceProviderId: sourceProvider.id,
    code,
    slug,
    name: bookmaker.name,
    shortName: bookmaker.shortName || null,
    websiteUrl: bookmaker.websiteUrl || null,
    logoUrl: bookmaker.logoUrl || null,
    isActive: bookmaker.isActive !== false,
    metadata: bookmaker.metadata || null,
  };

  const storedBookmaker = existingBookmaker
    ? await tx.bookmaker.update({
        where: { id: existingBookmaker.id },
        data: basePayload,
      })
    : await tx.bookmaker.create({
        data: basePayload,
      });

  await upsertProviderRef(tx, {
    providerId: sourceProvider.id,
    entityType: "BOOKMAKER",
    entityId: storedBookmaker.id,
    externalRef: bookmaker.externalRef,
    sourceCode: bookmaker.code || storedBookmaker.code,
    sourceName: storedBookmaker.name,
    feedFamily: "odds",
    role: providerContext.providerRole,
    tier: providerContext.providerTier,
    metadata: bookmaker.metadata,
  });

  return storedBookmaker;
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

function resolveFixtureTeamId(teamExternalRef, side, homeTeam, awayTeam) {
  const normalizedTeamExternalRef = toStringOrNull(teamExternalRef);

  if (
    normalizedTeamExternalRef &&
    normalizedTeamExternalRef === toStringOrNull(homeTeam?.externalRef)
  ) {
    return homeTeam.id;
  }

  if (
    normalizedTeamExternalRef &&
    normalizedTeamExternalRef === toStringOrNull(awayTeam?.externalRef)
  ) {
    return awayTeam.id;
  }

  if (side === "HOME") {
    return homeTeam.id;
  }

  if (side === "AWAY") {
    return awayTeam.id;
  }

  return null;
}

async function replaceFixtureIncidents(
  tx,
  storedFixture,
  incidents,
  homeTeam,
  awayTeam,
  sourceProvider,
  providerContext
) {
  await tx.incident.deleteMany({
    where: { fixtureId: storedFixture.id },
  });

  let created = 0;
  for (const incident of incidents || []) {
    const player = await ensurePlayer(tx, incident.player, sourceProvider, providerContext);
    const secondaryPlayer = await ensurePlayer(
      tx,
      incident.secondaryPlayer,
      sourceProvider,
      providerContext
    );

    await tx.incident.create({
      data: {
        fixtureId: storedFixture.id,
        teamId: resolveFixtureTeamId(
          incident.teamExternalRef,
          incident.side,
          homeTeam,
          awayTeam
        ),
        playerId: player?.id || null,
        secondaryPlayerId: secondaryPlayer?.id || null,
        minute: incident.minute,
        extraMinute: incident.extraMinute,
        sortOrder: incident.sortOrder || 0,
        side: incident.side,
        incidentKey: toStringOrNull(incident.incidentKey),
        type: incident.type || "EVENT",
        title: incident.title || "Event",
        description: incident.description || null,
        secondaryLabel: toStringOrNull(incident.secondaryLabel),
        payload: incident.payload || null,
      },
    });

    created += 1;
  }

  return created;
}

async function replaceFixtureLineups(
  tx,
  storedFixture,
  lineups,
  homeTeam,
  awayTeam,
  sourceProvider,
  providerContext
) {
  await tx.lineup.deleteMany({
    where: { fixtureId: storedFixture.id },
  });

  let created = 0;
  for (const lineupEntry of lineups || []) {
    const teamId = resolveFixtureTeamId(
      lineupEntry.teamExternalRef,
      lineupEntry.side,
      homeTeam,
      awayTeam
    );

    if (!teamId) {
      continue;
    }

    const player = await ensurePlayer(tx, lineupEntry.player, sourceProvider, providerContext);

    await tx.lineup.create({
      data: {
        fixtureId: storedFixture.id,
        teamId,
        playerId: player?.id || null,
        externalRef: toStringOrNull(lineupEntry.externalRef),
        side: lineupEntry.side,
        entryType: toStringOrNull(lineupEntry.entryType),
        jerseyNumber: toStringOrNull(lineupEntry.jerseyNumber),
        formationSlot: toStringOrNull(lineupEntry.formationSlot),
        positionLabel: toStringOrNull(lineupEntry.positionLabel),
        isStarter: Boolean(lineupEntry.isStarter),
        sortOrder: Number.isFinite(Number(lineupEntry.sortOrder))
          ? Number(lineupEntry.sortOrder)
          : 0,
        metadata: lineupEntry.metadata || null,
      },
    });

    created += 1;
  }

  return created;
}

async function replaceFixtureStatistics(tx, storedFixture, statistics, homeTeam, awayTeam) {
  await tx.statistic.deleteMany({
    where: { fixtureId: storedFixture.id },
  });

  let created = 0;
  for (const statistic of statistics || []) {
    await tx.statistic.create({
      data: {
        fixtureId: storedFixture.id,
        teamId: resolveFixtureTeamId(
          statistic.teamExternalRef,
          statistic.side,
          homeTeam,
          awayTeam
        ),
        side: statistic.side,
        metricKey: toStringOrNull(statistic.metricKey),
        name: statistic.name || "Statistic",
        statGroup: toStringOrNull(statistic.statGroup),
        period: toStringOrNull(statistic.period),
        value: toStringOrNull(statistic.value),
        sortOrder: Number.isFinite(Number(statistic.sortOrder))
          ? Number(statistic.sortOrder)
          : 0,
        metadata: statistic.metadata || null,
      },
    });

    created += 1;
  }

  return created;
}

export async function persistFixtureBatch(fixtures, { providerCode = null } = {}) {
  const providerContext = getProviderContext(providerCode);
  let processed = 0;

  for (const fixture of fixtures) {
    await db.$transaction(async (tx) => {
      const sourceProvider = await ensureSourceProvider(tx, providerContext);
      const sport = await ensureSport(tx, providerContext, sourceProvider);
      const country = await ensureCountry(
        tx,
        fixture.league?.country,
        sourceProvider,
        providerContext
      );
      const competition = await ensureCompetition(
        tx,
        fixture.league,
        sport.id,
        country?.id || null,
        sourceProvider,
        providerContext
      );
      const league = await ensureLeague(
        tx,
        fixture.league,
        {
          sportId: sport.id,
          countryId: country?.id || null,
          competitionId: competition?.id || null,
        },
        sourceProvider,
        providerContext
      );
      const season = await ensureSeason(
        tx,
        fixture.season,
        league.id,
        competition?.id || null,
        sourceProvider,
        providerContext
      );
      const stage = await ensureStage(
        tx,
        fixture.stage,
        competition?.id || null,
        season?.id || null,
        sourceProvider,
        providerContext
      );
      const round = await ensureRound(
        tx,
        fixture.roundInfo,
        competition?.id || null,
        season?.id || null,
        stage?.id || null,
        sourceProvider,
        providerContext
      );
      const homeTeam = await ensureTeam(
        tx,
        fixture.homeTeam,
        league.id,
        competition?.id || null,
        sourceProvider,
        providerContext
      );
      const awayTeam = await ensureTeam(
        tx,
        fixture.awayTeam,
        league.id,
        competition?.id || null,
        sourceProvider,
        providerContext
      );
      const venue = await ensureVenue(tx, fixture.venue, fixture.metadata);

      let existingFixture = fixture.externalRef
        ? await findProviderLinkedRecord(
            tx,
            "fixture",
            sourceProvider.id,
            "FIXTURE",
            fixture.externalRef,
            { resultSnapshot: true }
          )
        : null;

      if (!existingFixture && fixture.externalRef) {
        existingFixture = await tx.fixture.findUnique({
          where: { externalRef: fixture.externalRef },
          include: { resultSnapshot: true },
        });
      }

      const fixturePayload = {
        provider: providerContext.providerCode,
        sportId: sport.id,
        countryId: country?.id || null,
        competitionId: competition?.id || null,
        leagueId: league.id,
        seasonId: season.id,
        stageId: stage?.id || null,
        roundId: round?.id || null,
        venueId: venue?.id || null,
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        startsAt: fixture.startsAt || new Date(),
        status: fixture.status,
        venue: fixture.venue,
        round: fixture.round || round?.name || null,
        stateReason: fixture.stateReason,
        lastSyncedAt: new Date(),
        metadata: mergeJsonMetadata(existingFixture?.metadata, fixture.metadata),
      };

      const storedFixture = existingFixture
        ? await tx.fixture.update({
            where: { id: existingFixture.id },
            data: fixturePayload,
          })
        : await tx.fixture.create({
            data: {
              ...fixturePayload,
              externalRef: fixture.externalRef,
            },
          });

      await upsertProviderRef(tx, {
        providerId: sourceProvider.id,
        entityType: "FIXTURE",
        entityId: storedFixture.id,
        externalRef: fixture.externalRef,
        sourceCode: fixture.externalRef,
        sourceName: `${fixture.homeTeam?.name || "Home"} vs ${fixture.awayTeam?.name || "Away"}`,
        feedFamily: "fixtures",
        role: providerContext.providerRole,
        tier: providerContext.providerTier,
        metadata: fixture.metadata,
      });

      await replaceFixtureParticipants(tx, storedFixture, homeTeam, awayTeam);

      if (fixture.detailPayloads?.incidents) {
        await replaceFixtureIncidents(
          tx,
          storedFixture,
          fixture.incidents,
          homeTeam,
          awayTeam,
          sourceProvider,
          providerContext
        );
      }

      if (fixture.detailPayloads?.lineups) {
        await replaceFixtureLineups(
          tx,
          storedFixture,
          fixture.lineups,
          homeTeam,
          awayTeam,
          sourceProvider,
          providerContext
        );
      }

      if (fixture.detailPayloads?.statistics) {
        await replaceFixtureStatistics(
          tx,
          storedFixture,
          fixture.statistics,
          homeTeam,
          awayTeam
        );
      }

      const shouldKeepFrozenSnapshot =
        existingFixture?.resultSnapshot &&
        isTerminalStatus(existingFixture.status) &&
        existingFixture.status === fixture.status;

      if (!shouldKeepFrozenSnapshot && fixture.resultSnapshot) {
        await tx.scoreSnapshot.upsert({
          where: { fixtureId: storedFixture.id },
          update: {
            homeScore: fixture.resultSnapshot.homeScore,
            awayScore: fixture.resultSnapshot.awayScore,
            homePenaltyScore: fixture.resultSnapshot.homePenaltyScore || null,
            awayPenaltyScore: fixture.resultSnapshot.awayPenaltyScore || null,
            phase: fixture.resultSnapshot.phase || null,
            winnerSide: fixture.resultSnapshot.winnerSide || null,
            statusText: fixture.resultSnapshot.statusText,
            payload: fixture.resultSnapshot.payload,
            capturedAt: new Date(),
          },
          create: {
            fixtureId: storedFixture.id,
            homeScore: fixture.resultSnapshot.homeScore,
            awayScore: fixture.resultSnapshot.awayScore,
            homePenaltyScore: fixture.resultSnapshot.homePenaltyScore || null,
            awayPenaltyScore: fixture.resultSnapshot.awayPenaltyScore || null,
            phase: fixture.resultSnapshot.phase || null,
            winnerSide: fixture.resultSnapshot.winnerSide || null,
            statusText: fixture.resultSnapshot.statusText,
            payload: fixture.resultSnapshot.payload,
            capturedAt: new Date(),
          },
        });
      }
    });

    processed += 1;
  }

  if (processed > 0) {
    await revalidateSportsSyncTags({ fixtures }, "sports-sync:fixtures");
  }

  return processed;
}

export async function persistTeamBatch(
  teams,
  seasonExternalRef,
  { providerCode = null } = {}
) {
  const providerContext = getProviderContext(providerCode);
  if (!teams.length) {
    return 0;
  }

  const sourceProvider = await db.$transaction((tx) => ensureSourceProvider(tx, providerContext));
  const seasonId =
    (await findEntityIdByProviderRef(
      db,
      sourceProvider.id,
      "SEASON",
      toStringOrNull(seasonExternalRef)
    )) || null;
  const season = seasonId
    ? await db.season.findUnique({
        where: { id: seasonId },
      })
    : await db.season.findUnique({
        where: { externalRef: toStringOrNull(seasonExternalRef) },
      });

  if (!season) {
    throw new Error(`Season ${seasonExternalRef} must exist before syncing teams.`);
  }

  let processed = 0;
  for (const team of teams) {
    await db.$transaction(async (tx) => {
      const ensuredProvider = await ensureSourceProvider(tx, providerContext);
      await ensureTeam(
        tx,
        team,
        season.leagueId,
        season.competitionId,
        ensuredProvider,
        providerContext
      );
    });
    processed += 1;
  }

  if (processed > 0) {
    await revalidateSportsSyncTags({}, "sports-sync:teams");
  }

  return processed;
}

export async function persistStandingsBatch(standings, { providerCode = null } = {}) {
  const providerContext = getProviderContext(providerCode);
  let processed = 0;

  for (const standing of standings) {
    await db.$transaction(async (tx) => {
      const sourceProvider = await ensureSourceProvider(tx, providerContext);
      const seasonId =
        (await findEntityIdByProviderRef(
          tx,
          sourceProvider.id,
          "SEASON",
          standing.seasonExternalRef
        )) || null;
      const season = seasonId
        ? await tx.season.findUnique({
            where: { id: seasonId },
          })
        : await tx.season.findUnique({
            where: { externalRef: standing.seasonExternalRef },
          });

      if (!season) {
        throw new Error(`Season ${standing.seasonExternalRef} must exist before standings sync.`);
      }

      const team = await ensureTeam(
        tx,
        standing.team,
        season.leagueId,
        season.competitionId,
        sourceProvider,
        providerContext
      );
      const groupName = normalizeStandingGroupName(standing.groupName);

      await tx.standing.upsert({
        where: {
          seasonId_teamId_scope_groupName: {
            seasonId: season.id,
            teamId: team.id,
            scope: standing.scope || "OVERALL",
            groupName,
          },
        },
        update: {
          competitionId: season.competitionId,
          scope: standing.scope || "OVERALL",
          groupName,
          position: standing.position,
          played: standing.played,
          won: standing.won,
          drawn: standing.drawn,
          lost: standing.lost,
          goalsFor: standing.goalsFor,
          goalsAgainst: standing.goalsAgainst,
          points: standing.points,
          metadata: standing.metadata || null,
        },
        create: {
          seasonId: season.id,
          competitionId: season.competitionId,
          teamId: team.id,
          scope: standing.scope || "OVERALL",
          groupName,
          position: standing.position,
          played: standing.played,
          won: standing.won,
          drawn: standing.drawn,
          lost: standing.lost,
          goalsFor: standing.goalsFor,
          goalsAgainst: standing.goalsAgainst,
          points: standing.points,
          metadata: standing.metadata || null,
        },
      });
    });

    processed += 1;
  }

  if (processed > 0) {
    await revalidateSportsSyncTags({}, "sports-sync:standings");
  }

  return processed;
}

async function upsertOddsMarket(tx, fixtureId, market, sourceProvider, providerContext) {
  const bookmaker = await ensureBookmaker(
    tx,
    market.bookmakerInfo || { name: market.bookmaker },
    sourceProvider,
    providerContext
  );
  const providerLookupRef = toStringOrNull(market.externalRef || `${market.bookmaker}:${market.marketType}`);
  let existingMarket = providerLookupRef
    ? await findProviderLinkedRecord(
        tx,
        "oddsMarket",
        sourceProvider.id,
        "ODDS_MARKET",
        providerLookupRef
      )
    : null;

  if (!existingMarket && market.externalRef) {
    existingMarket = await tx.oddsMarket.findUnique({
      where: { externalRef: market.externalRef },
    });
  }

  if (!existingMarket) {
    existingMarket = await tx.oddsMarket.findFirst({
      where: {
        fixtureId,
        bookmaker: market.bookmaker,
        marketType: market.marketType,
      },
    });
  }

  const basePayload = {
    provider: providerContext.providerCode,
    fixtureId,
    bookmakerId: bookmaker?.id || null,
    bookmaker: market.bookmaker,
    marketType: market.marketType,
    suspended: market.suspended,
    lastSyncedAt: new Date(),
    metadata: market.metadata,
  };

  const storedMarket = existingMarket
    ? await tx.oddsMarket.update({
        where: { id: existingMarket.id },
        data: {
          ...basePayload,
          ...(market.externalRef && !existingMarket.externalRef
            ? { externalRef: market.externalRef }
            : {}),
        },
      })
    : await tx.oddsMarket.create({
        data: {
          ...basePayload,
          externalRef: market.externalRef,
        },
      });

  await upsertProviderRef(tx, {
    providerId: sourceProvider.id,
    entityType: "ODDS_MARKET",
    entityId: storedMarket.id,
    externalRef: market.externalRef,
    sourceCode: `${market.bookmaker}:${market.marketType}`,
    sourceName: market.marketType,
    feedFamily: "odds",
    role: providerContext.providerRole,
    tier: providerContext.providerTier,
    metadata: market.metadata,
  });

  return storedMarket;
}

export async function persistOddsBatch(markets, { providerCode = null } = {}) {
  const providerContext = getProviderContext(providerCode);
  let processed = 0;
  const fixtureRefs = [...new Set(markets.map((market) => market.fixtureExternalRef).filter(Boolean))];

  for (const market of markets) {
    await db.$transaction(async (tx) => {
      const sourceProvider = await ensureSourceProvider(tx, providerContext);
      const fixtureId =
        (await findEntityIdByProviderRef(
          tx,
          sourceProvider.id,
          "FIXTURE",
          market.fixtureExternalRef
        )) || null;
      const fixture = fixtureId
        ? await tx.fixture.findUnique({
            where: { id: fixtureId },
          })
        : await tx.fixture.findUnique({
            where: { externalRef: market.fixtureExternalRef },
          });

      if (!fixture) {
        throw new Error(`Fixture ${market.fixtureExternalRef} must exist before odds sync.`);
      }

      const storedMarket = await upsertOddsMarket(
        tx,
        fixture.id,
        market,
        sourceProvider,
        providerContext
      );

      for (const selection of market.selections) {
        const selectionLine = decimalOrNull(selection.line);

        if (selection.externalRef) {
          const storedSelection = await tx.oddsSelection.upsert({
            where: { externalRef: selection.externalRef },
            update: {
              oddsMarketId: storedMarket.id,
              label: selection.label,
              line: selectionLine,
              priceDecimal: String(selection.priceDecimal),
              isActive: selection.isActive,
              metadata: selection.metadata,
            },
            create: {
              externalRef: selection.externalRef,
              oddsMarketId: storedMarket.id,
              label: selection.label,
              line: selectionLine,
              priceDecimal: String(selection.priceDecimal),
              isActive: selection.isActive,
              metadata: selection.metadata,
            },
          });
          await upsertProviderRef(tx, {
            providerId: sourceProvider.id,
            entityType: "ODDS_SELECTION",
            entityId: storedSelection.id,
            externalRef: selection.externalRef,
            sourceCode: `${selection.label}:${selectionLine || "base"}`,
            sourceName: selection.label,
            feedFamily: "odds",
            role: providerContext.providerRole,
            tier: providerContext.providerTier,
            metadata: selection.metadata,
          });
          continue;
        }

        const existing = await tx.oddsSelection.findFirst({
          where: {
            oddsMarketId: storedMarket.id,
            label: selection.label,
            line: selectionLine,
          },
        });

        if (existing) {
          const storedSelection = await tx.oddsSelection.update({
            where: { id: existing.id },
            data: {
              priceDecimal: String(selection.priceDecimal),
              isActive: selection.isActive,
              metadata: selection.metadata,
            },
          });
          await upsertProviderRef(tx, {
            providerId: sourceProvider.id,
            entityType: "ODDS_SELECTION",
            entityId: storedSelection.id,
            sourceCode: `${selection.label}:${selectionLine || "base"}`,
            sourceName: selection.label,
            feedFamily: "odds",
            role: providerContext.providerRole,
            tier: providerContext.providerTier,
            metadata: selection.metadata,
          });
          continue;
        }

        const storedSelection = await tx.oddsSelection.create({
          data: {
            oddsMarketId: storedMarket.id,
            label: selection.label,
            line: selectionLine,
            priceDecimal: String(selection.priceDecimal),
            isActive: selection.isActive,
            metadata: selection.metadata,
          },
        });
        await upsertProviderRef(tx, {
          providerId: sourceProvider.id,
          entityType: "ODDS_SELECTION",
          entityId: storedSelection.id,
          sourceCode: `${selection.label}:${selectionLine || "base"}`,
          sourceName: selection.label,
          feedFamily: "odds",
          role: providerContext.providerRole,
          tier: providerContext.providerTier,
          metadata: selection.metadata,
        });
      }
    });

    processed += 1;
  }

  if (processed > 0) {
    await revalidateSportsSyncTags({ fixtureRefs }, "sports-sync:odds");
  }

  return processed;
}

export async function persistPredictionBatch(predictions, { providerCode = null } = {}) {
  const providerContext = getProviderContext(providerCode);
  let processed = 0;
  const fixtureRefs = [
    ...new Set(
      (predictions || []).map((prediction) => prediction.fixtureExternalRef).filter(Boolean)
    ),
  ];

  for (const prediction of predictions || []) {
    if (!prediction?.key || !prediction?.title) {
      continue;
    }

    await db.$transaction(async (tx) => {
      const sourceProvider = await ensureSourceProvider(tx, providerContext);
      const fixtureId =
        prediction.fixtureExternalRef
          ? (await findEntityIdByProviderRef(
              tx,
              sourceProvider.id,
              "FIXTURE",
              prediction.fixtureExternalRef
            )) ||
            (
              await tx.fixture.findUnique({
                where: { externalRef: prediction.fixtureExternalRef },
                select: { id: true },
              })
            )?.id ||
            null
          : null;
      const competitionId =
        prediction.competitionExternalRef
          ? (await findEntityIdByProviderRef(
              tx,
              sourceProvider.id,
              "COMPETITION",
              prediction.competitionExternalRef
            )) ||
            (
              await tx.competition.findUnique({
                where: { externalRef: prediction.competitionExternalRef },
                select: { id: true },
              })
            )?.id ||
            null
          : null;
      const teamId =
        prediction.teamExternalRef
          ? (await findEntityIdByProviderRef(
              tx,
              sourceProvider.id,
              "TEAM",
              prediction.teamExternalRef
            )) ||
            (
              await tx.team.findUnique({
                where: { externalRef: prediction.teamExternalRef },
                select: { id: true },
              })
            )?.id ||
            null
          : null;
      const bookmakerId =
        prediction.bookmakerExternalRef
          ? (await findEntityIdByProviderRef(
              tx,
              sourceProvider.id,
              "BOOKMAKER",
              prediction.bookmakerExternalRef
            )) ||
            (
              await tx.bookmaker.findFirst({
                where: {
                  OR: [
                    { code: prediction.bookmakerExternalRef },
                    { slug: prediction.bookmakerExternalRef },
                    { name: prediction.bookmakerExternalRef },
                  ],
                },
                select: { id: true },
              })
            )?.id ||
            null
          : null;

      await tx.predictionRecommendation.upsert({
        where: {
          key: prediction.key,
        },
        update: {
          sourceProviderId: sourceProvider.id,
          fixtureId,
          competitionId,
          teamId,
          bookmakerId,
          recommendationType: toStringOrNull(prediction.recommendationType) || "PICK",
          title: prediction.title,
          summary: toStringOrNull(prediction.summary),
          marketType: toStringOrNull(prediction.marketType),
          selectionLabel: toStringOrNull(prediction.selectionLabel),
          line: decimalOrNull(prediction.line),
          priceDecimal: decimalOrNull(prediction.priceDecimal),
          confidence: Number.isFinite(Number(prediction.confidence))
            ? Number(prediction.confidence)
            : null,
          edgeScore: decimalOrNull(prediction.edgeScore),
          isPublished: prediction.isPublished !== false,
          publishedAt: prediction.publishedAt || null,
          expiresAt: prediction.expiresAt || null,
          metadata: prediction.metadata || null,
        },
        create: {
          sourceProviderId: sourceProvider.id,
          fixtureId,
          competitionId,
          teamId,
          bookmakerId,
          key: prediction.key,
          recommendationType: toStringOrNull(prediction.recommendationType) || "PICK",
          title: prediction.title,
          summary: toStringOrNull(prediction.summary),
          marketType: toStringOrNull(prediction.marketType),
          selectionLabel: toStringOrNull(prediction.selectionLabel),
          line: decimalOrNull(prediction.line),
          priceDecimal: decimalOrNull(prediction.priceDecimal),
          confidence: Number.isFinite(Number(prediction.confidence))
            ? Number(prediction.confidence)
            : null,
          edgeScore: decimalOrNull(prediction.edgeScore),
          isPublished: prediction.isPublished !== false,
          publishedAt: prediction.publishedAt || null,
          expiresAt: prediction.expiresAt || null,
          metadata: prediction.metadata || null,
        },
      });
    });

    processed += 1;
  }

  if (processed > 0) {
    await revalidateSportsSyncTags({ fixtureRefs }, "sports-sync:predictions");
  }

  return processed;
}

export async function replaceBroadcastChannels(
  fixtureExternalRef,
  channels,
  { providerCode = null } = {}
) {
  const normalizedFixtureRef = toStringOrNull(fixtureExternalRef);
  if (!normalizedFixtureRef) {
    return 0;
  }

  const providerContext = getProviderContext(providerCode);

  const created = await db.$transaction(async (tx) => {
    const sourceProvider = await ensureSourceProvider(tx, providerContext);
    const fixtureId =
      (await findEntityIdByProviderRef(tx, sourceProvider.id, "FIXTURE", normalizedFixtureRef)) ||
      null;
    const fixture = fixtureId
      ? await tx.fixture.findUnique({
          where: { id: fixtureId },
        })
      : await tx.fixture.findUnique({
          where: { externalRef: normalizedFixtureRef },
        });

    if (!fixture) {
      throw new Error(`Fixture ${normalizedFixtureRef} must exist before broadcast sync.`);
    }

    const existingChannels = await tx.broadcastChannel.findMany({
      where: { fixtureId: fixture.id },
      select: { id: true },
    });

    if (existingChannels.length) {
      await tx.providerEntityRef.deleteMany({
        where: {
          providerId: sourceProvider.id,
          entityType: "BROADCAST_CHANNEL",
          entityId: {
            in: existingChannels.map((channel) => channel.id),
          },
        },
      });
    }

    await tx.broadcastChannel.deleteMany({
      where: { fixtureId: fixture.id },
    });

    if (!channels.length) {
      return 0;
    }

    let created = 0;
    for (const channel of channels) {
      const storedChannel = await tx.broadcastChannel.create({
        data: {
          fixtureId: fixture.id,
          externalRef: channel.externalRef || null,
          sourceCode: channel.sourceCode || null,
          name: channel.name,
          territory: channel.territory,
          channelType: channel.channelType,
          url: channel.url,
          isActive: channel.isActive,
          metadata: channel.metadata,
        },
      });

      await upsertProviderRef(tx, {
        providerId: sourceProvider.id,
        entityType: "BROADCAST_CHANNEL",
        entityId: storedChannel.id,
        externalRef: channel.externalRef,
        sourceCode: channel.sourceCode || channel.name,
        sourceName: channel.name,
        feedFamily: "broadcast",
        role: providerContext.providerRole,
        tier: providerContext.providerTier,
        metadata: channel.metadata,
      });

      created += 1;
    }

    return created;
  });

  await revalidateSportsSyncTags({ fixtureRefs: [normalizedFixtureRef] }, "sports-sync:broadcast");

  return created;
}
