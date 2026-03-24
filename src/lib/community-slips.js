import { safeDataRead } from "./data-access";
import { db } from "./db";
import { buildFixtureOddsModule } from "./coreui/odds-broadcast";

const MAX_COMMUNITY_SLIP_PICKS = 8;

function toNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (typeof value?.toNumber === "function") {
    const parsed = value.toNumber();
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (value != null) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function normalizeString(value, { maxLength = 191, fallback = null } = {}) {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim();
  if (!normalized) {
    return fallback;
  }

  return normalized.slice(0, maxLength);
}

function normalizeSummary(value) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized ? normalized.slice(0, 1200) : null;
}

function formatDecimal(value, locale = "en", digits = 2) {
  const parsed = toNumber(value);
  if (parsed == null) {
    return null;
  }

  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(parsed);
}

function buildFixtureLabel(fixture) {
  if (!fixture) {
    return "Fixture";
  }

  return `${fixture.homeTeam?.name || "Home"} vs ${fixture.awayTeam?.name || "Away"}`;
}

function dedupePicks(picks = []) {
  const seen = new Set();
  const unique = [];

  for (const pick of picks) {
    const selectionId = normalizeString(pick?.oddsSelectionId, { maxLength: 191 });
    if (!selectionId || seen.has(selectionId)) {
      continue;
    }

    seen.add(selectionId);
    unique.push({
      fixtureId: normalizeString(pick?.fixtureId, { maxLength: 191 }),
      oddsSelectionId: selectionId,
      oddsMarketId: normalizeString(pick?.oddsMarketId, { maxLength: 191 }),
    });
  }

  return unique.slice(0, MAX_COMMUNITY_SLIP_PICKS);
}

function buildDefaultSlipTitle(selections = []) {
  if (!selections.length) {
    return "New betting slip";
  }

  if (selections.length === 1) {
    const [selection] = selections;
    return `${selection.fixtureLabel}: ${selection.selectionLabel}`;
  }

  if (selections.length === 2) {
    return `${selections[0].fixtureLabel} + ${selections[1].fixtureLabel}`;
  }

  return `${selections[0].fixtureLabel} multi x${selections.length}`;
}

function computeSlipTotals(selections = [], stakeAmount = null) {
  const totalOdds = selections.reduce((product, selection) => {
    const price = toNumber(selection.priceDecimal);
    return price == null ? product : product * price;
  }, 1);
  const normalizedStake = toNumber(stakeAmount);

  return {
    selectionCount: selections.length,
    totalOdds: selections.length ? Number(totalOdds.toFixed(4)) : null,
    expectedPayout:
      selections.length && normalizedStake != null
        ? Number((normalizedStake * totalOdds).toFixed(2))
        : null,
  };
}

function buildSelectionSnapshot(record, sortOrder = 0) {
  const fixture = record?.oddsMarket?.fixture;

  return {
    fixtureId: fixture?.id || null,
    oddsSelectionId: record.id,
    oddsMarketId: record.oddsMarket?.id || null,
    marketType: record.oddsMarket?.marketType || null,
    selectionLabel: record.label,
    line: toNumber(record.line),
    priceDecimal: toNumber(record.priceDecimal),
    bookmaker: record.oddsMarket?.bookmaker || null,
    fixtureLabel: buildFixtureLabel(fixture),
    metadata: fixture
      ? {
          fixtureRef: fixture.externalRef || fixture.id,
          competitionName: fixture.league?.name || null,
          startsAt: fixture.startsAt?.toISOString?.() || fixture.startsAt || null,
        }
      : null,
    sortOrder,
  };
}

function serializeSlipSelection(selection, locale = "en") {
  const startsAt = selection.metadata?.startsAt || null;

  return {
    id: selection.id,
    oddsSelectionId: selection.oddsSelectionId,
    oddsMarketId: selection.oddsMarketId || null,
    fixtureId: selection.fixtureId,
    fixtureRef: selection.metadata?.fixtureRef || selection.fixture?.externalRef || selection.fixtureId,
    fixtureLabel: selection.fixtureLabel || buildFixtureLabel(selection.fixture),
    competitionName:
      selection.metadata?.competitionName || selection.fixture?.league?.name || null,
    marketType: selection.marketType || selection.oddsMarket?.marketType || null,
    selectionLabel: selection.selectionLabel,
    bookmaker: selection.bookmaker || selection.oddsMarket?.bookmaker || null,
    priceDecimal: toNumber(selection.priceDecimal),
    priceLabel: formatDecimal(selection.priceDecimal, locale, 2),
    line: toNumber(selection.line),
    lineLabel:
      toNumber(selection.line) != null ? `Line ${formatDecimal(selection.line, locale, 1)}` : null,
    startsAt,
  };
}

function serializeSlipAuthor(user) {
  if (!user) {
    return {
      id: null,
      displayName: "Community",
      username: null,
    };
  }

  return {
    id: user.id,
    displayName: user.displayName || user.username || "Community",
    username: user.username || null,
  };
}

function serializeCommunitySlip(slip, { locale = "en", currentUserId = null } = {}) {
  const selections = (slip.selections || [])
    .slice()
    .sort((left, right) => (left.sortOrder || 0) - (right.sortOrder || 0))
    .map((selection) => serializeSlipSelection(selection, locale));

  return {
    id: slip.id,
    title: slip.title,
    summary: slip.summary || null,
    status: slip.status,
    visibility: slip.visibility,
    selectionCount: slip.selectionCount || selections.length,
    totalOdds: toNumber(slip.totalOdds),
    totalOddsLabel: formatDecimal(slip.totalOdds, locale, 2),
    stakeAmount: toNumber(slip.stakeAmount),
    stakeAmountLabel: formatDecimal(slip.stakeAmount, locale, 2),
    expectedPayout: toNumber(slip.expectedPayout),
    expectedPayoutLabel: formatDecimal(slip.expectedPayout, locale, 2),
    likeCount: slip.likeCount || 0,
    isFeatured: Boolean(slip.isFeatured),
    outcomeStatus: slip.outcomeStatus,
    outcomeSummary: slip.outcomeSummary || null,
    publishedAt: slip.publishedAt?.toISOString?.() || slip.publishedAt || null,
    createdAt: slip.createdAt?.toISOString?.() || slip.createdAt || null,
    updatedAt: slip.updatedAt?.toISOString?.() || slip.updatedAt || null,
    author: serializeSlipAuthor(slip.user),
    selections,
    fixtureRefs: [...new Set(selections.map((selection) => selection.fixtureRef).filter(Boolean))],
    fixtureIds: [...new Set(selections.map((selection) => selection.fixtureId).filter(Boolean))],
    primaryFixtureRef: selections[0]?.fixtureRef || null,
    isOwner: Boolean(currentUserId && slip.userId === currentUserId),
    hasLiked: Boolean((slip.likes || []).some((entry) => entry.userId === currentUserId)),
  };
}

function buildCatalogOption(market, selection) {
  return {
    fixtureId: null,
    oddsMarketId: market.id,
    oddsSelectionId: selection.id,
    marketType: market.marketType,
    selectionLabel: selection.label,
    lineLabel: selection.lineLabel || null,
    priceDecimal: toNumber(selection.priceDecimal),
    priceLabel: selection.priceLabel || null,
    bookmaker: market.bookmaker || null,
    bookmakerId: market.bookmakerId || null,
  };
}

export function buildFixtureSlipCatalogEntry(
  fixture,
  { locale = "en", viewerTerritory = "US" } = {}
) {
  const odds = buildFixtureOddsModule(fixture, {
    locale,
    viewerTerritory,
    enabled: true,
  });

  const marketGroups = odds.groups
    .map((group) => ({
      id: group.id,
      label: group.label,
      options: group.markets.flatMap((market) =>
        (market.selections || [])
          .filter((selection) => selection.isActive)
          .map((selection) => buildCatalogOption(market, selection))
      ),
    }))
    .filter((group) => group.options.length);

  if (!marketGroups.length) {
    return null;
  }

  return {
    fixtureId: fixture.id,
    fixtureRef: fixture.externalRef || fixture.id,
    fixtureLabel: buildFixtureLabel(fixture),
    competitionName: fixture.league?.name || null,
    startsAt: fixture.startsAt?.toISOString?.() || fixture.startsAt || null,
    marketGroups: marketGroups.map((group) => ({
      ...group,
      options: group.options.map((option) => ({
        ...option,
        fixtureId: fixture.id,
      })),
    })),
  };
}

async function readCatalogFixtures({
  locale = "en",
  viewerTerritory = "US",
  fixtureId = null,
  limit = 6,
} = {}) {
  const where = fixtureId
    ? {
        id: fixtureId,
      }
    : {
        OR: [
          { status: "LIVE" },
          { startsAt: { gte: new Date(Date.now() - 1000 * 60 * 60 * 2) } },
        ],
      };

  const fixtures = await safeDataRead(
    () =>
      db.fixture.findMany({
        where,
        orderBy: [{ startsAt: "asc" }],
        take: fixtureId ? 1 : limit,
        include: {
          league: true,
          homeTeam: true,
          awayTeam: true,
          oddsMarkets: {
            include: {
              selections: true,
            },
            orderBy: [{ bookmaker: "asc" }, { marketType: "asc" }],
            take: 16,
          },
        },
      }),
    []
  );

  return fixtures
    .map((fixture) =>
      buildFixtureSlipCatalogEntry(fixture, {
        locale,
        viewerTerritory,
      })
    )
    .filter(Boolean);
}

async function readPublicCommunitySlips({ currentUserId = null, fixtureId = null, take = 8 } = {}) {
  return safeDataRead(
    () =>
      db.communitySlip.findMany({
        where: {
          status: "PUBLISHED",
          visibility: "PUBLIC",
          ...(fixtureId
            ? {
                selections: {
                  some: {
                    fixtureId,
                  },
                },
              }
            : {}),
        },
        orderBy: [
          { isFeatured: "desc" },
          { likeCount: "desc" },
          { publishedAt: "desc" },
          { createdAt: "desc" },
        ],
        take,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
            },
          },
          selections: {
            orderBy: [{ sortOrder: "asc" }],
          },
          likes: currentUserId
            ? {
                where: {
                  userId: currentUserId,
                },
                select: {
                  userId: true,
                },
              }
            : undefined,
        },
      }),
    []
  );
}

async function readUserCommunitySlips(userId) {
  if (!userId) {
    return [];
  }

  return safeDataRead(
    () =>
      db.communitySlip.findMany({
        where: {
          userId,
        },
        orderBy: [{ updatedAt: "desc" }],
        take: 8,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
            },
          },
          selections: {
            orderBy: [{ sortOrder: "asc" }],
          },
          likes: {
            where: {
              userId,
            },
            select: {
              userId: true,
            },
          },
        },
      }),
    []
  );
}

async function readCommunitySlipStats(fixtureId = null) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [publicCount, todayCount, creatorRows, activeFixtureRows] = await Promise.all([
    safeDataRead(
      () =>
        db.communitySlip.count({
          where: {
            status: "PUBLISHED",
            visibility: "PUBLIC",
            ...(fixtureId
              ? {
                  selections: {
                    some: {
                      fixtureId,
                    },
                  },
                }
              : {}),
          },
        }),
      0
    ),
    safeDataRead(
      () =>
        db.communitySlip.count({
          where: {
            status: "PUBLISHED",
            visibility: "PUBLIC",
            publishedAt: {
              gte: startOfDay,
            },
            ...(fixtureId
              ? {
                  selections: {
                    some: {
                      fixtureId,
                    },
                  },
                }
              : {}),
          },
        }),
      0
    ),
    safeDataRead(
      () =>
        db.communitySlip.findMany({
          where: {
            status: "PUBLISHED",
            visibility: "PUBLIC",
            ...(fixtureId
              ? {
                  selections: {
                    some: {
                      fixtureId,
                    },
                  },
                }
              : {}),
          },
          distinct: ["userId"],
          select: {
            userId: true,
          },
        }),
      []
    ),
    safeDataRead(
      () =>
        db.communitySlipSelection.findMany({
          where: {
            communitySlip: {
              status: "PUBLISHED",
              visibility: "PUBLIC",
            },
            ...(fixtureId ? { fixtureId } : {}),
          },
          distinct: ["fixtureId"],
          select: {
            fixtureId: true,
          },
        }),
      []
    ),
  ]);

  return {
    publicCount,
    todayCount,
    creatorCount: creatorRows.length,
    activeFixtureCount: activeFixtureRows.length,
  };
}

export async function getCommunitySlipHubData({
  locale = "en",
  viewerTerritory = "US",
  currentUserId = null,
  fixtureId = null,
  includeComposerCatalog = false,
  publicLimit = 6,
  catalogFixtureLimit = 6,
} = {}) {
  const [publicSlips, mySlips, stats, catalog] = await Promise.all([
    readPublicCommunitySlips({
      currentUserId,
      fixtureId,
      take: Math.max(publicLimit + 1, 8),
    }),
    readUserCommunitySlips(currentUserId),
    readCommunitySlipStats(fixtureId),
    includeComposerCatalog
      ? readCatalogFixtures({
          locale,
          viewerTerritory,
          fixtureId,
          limit: catalogFixtureLimit,
        })
      : Promise.resolve([]),
  ]);

  const serializedPublic = publicSlips.map((slip) =>
    serializeCommunitySlip(slip, {
      locale,
      currentUserId,
    })
  );
  const featured = serializedPublic[0] || null;
  const latest = serializedPublic
    .filter((entry) => entry.id !== featured?.id)
    .slice(0, publicLimit);
  const mine = mySlips.map((slip) =>
    serializeCommunitySlip(slip, {
      locale,
      currentUserId,
    })
  );

  return {
    summary: stats,
    featured,
    latest,
    mine,
    catalog,
  };
}

export async function getCommunitySlipById(
  slipId,
  { locale = "en", currentUserId = null } = {}
) {
  if (!slipId) {
    return null;
  }

  const slip = await safeDataRead(
    () =>
      db.communitySlip.findFirst({
        where: {
          id: slipId,
          OR: [
            {
              status: "PUBLISHED",
              visibility: "PUBLIC",
            },
            currentUserId
              ? {
                  userId: currentUserId,
                }
              : undefined,
          ].filter(Boolean),
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
            },
          },
          selections: {
            orderBy: [{ sortOrder: "asc" }],
          },
          likes: currentUserId
            ? {
                where: {
                  userId: currentUserId,
                },
                select: {
                  userId: true,
                },
              }
            : undefined,
        },
      }),
    null
  );

  return slip
    ? serializeCommunitySlip(slip, {
        locale,
        currentUserId,
      })
    : null;
}

export async function saveCommunitySlip({
  userId,
  slipId = null,
  locale = "en",
  title,
  summary,
  stakeAmount = null,
  publish = false,
  picks = [],
}) {
  if (!userId) {
    throw new Error("You need an account to save a betting slip.");
  }

  const normalizedPicks = dedupePicks(picks);
  if (!normalizedPicks.length) {
    throw new Error("Add at least one pick before saving your slip.");
  }

  const selectionIds = normalizedPicks.map((pick) => pick.oddsSelectionId);
  const selectionRecords = await db.oddsSelection.findMany({
    where: {
      id: {
        in: selectionIds,
      },
      isActive: true,
    },
    include: {
      oddsMarket: {
        include: {
          fixture: {
            include: {
              homeTeam: true,
              awayTeam: true,
              league: true,
            },
          },
        },
      },
    },
  });

  if (selectionRecords.length !== selectionIds.length) {
    throw new Error("One or more selected odds are no longer available.");
  }

  const recordMap = new Map(selectionRecords.map((record) => [record.id, record]));
  const selections = normalizedPicks.map((pick, index) => {
    const record = recordMap.get(pick.oddsSelectionId);
    if (!record?.oddsMarket?.fixture?.id) {
      throw new Error("Selected odds could not be linked to a fixture.");
    }

    if (pick.fixtureId && pick.fixtureId !== record.oddsMarket.fixture.id) {
      throw new Error("A selected pick no longer matches its fixture.");
    }

    return buildSelectionSnapshot(record, index);
  });

  const metrics = computeSlipTotals(selections, stakeAmount);
  const normalizedTitle =
    normalizeString(title, {
      maxLength: 191,
    }) || buildDefaultSlipTitle(selections);
  const normalizedSummary = normalizeSummary(summary);
  const normalizedStake = toNumber(stakeAmount);
  const now = new Date();

  const savedSlipId = await db.$transaction(async (tx) => {
    if (slipId) {
      const existing = await tx.communitySlip.findFirst({
        where: {
          id: slipId,
          userId,
        },
        select: {
          id: true,
          status: true,
          publishedAt: true,
        },
      });

      if (!existing) {
        throw new Error("Slip not found.");
      }

      await tx.communitySlip.update({
        where: {
          id: slipId,
        },
        data: {
          title: normalizedTitle,
          summary: normalizedSummary,
          stakeAmount: normalizedStake,
          totalOdds: metrics.totalOdds,
          expectedPayout: metrics.expectedPayout,
          selectionCount: metrics.selectionCount,
          status: publish ? "PUBLISHED" : "DRAFT",
          visibility: publish ? "PUBLIC" : "PRIVATE",
          publishedAt: publish ? existing.publishedAt || now : null,
        },
      });

      await tx.communitySlipSelection.deleteMany({
        where: {
          communitySlipId: slipId,
        },
      });

      await tx.communitySlipSelection.createMany({
        data: selections.map((selection) => ({
          communitySlipId: slipId,
          fixtureId: selection.fixtureId,
          oddsSelectionId: selection.oddsSelectionId,
          oddsMarketId: selection.oddsMarketId,
          marketType: selection.marketType,
          selectionLabel: selection.selectionLabel,
          line: selection.line,
          priceDecimal: selection.priceDecimal,
          bookmaker: selection.bookmaker,
          fixtureLabel: selection.fixtureLabel,
          sortOrder: selection.sortOrder,
          metadata: selection.metadata,
        })),
      });

      return slipId;
    }

    const created = await tx.communitySlip.create({
      data: {
        userId,
        title: normalizedTitle,
        summary: normalizedSummary,
        stakeAmount: normalizedStake,
        totalOdds: metrics.totalOdds,
        expectedPayout: metrics.expectedPayout,
        selectionCount: metrics.selectionCount,
        status: publish ? "PUBLISHED" : "DRAFT",
        visibility: publish ? "PUBLIC" : "PRIVATE",
        publishedAt: publish ? now : null,
      },
      select: {
        id: true,
      },
    });

    await tx.communitySlipSelection.createMany({
      data: selections.map((selection) => ({
        communitySlipId: created.id,
        fixtureId: selection.fixtureId,
        oddsSelectionId: selection.oddsSelectionId,
        oddsMarketId: selection.oddsMarketId,
        marketType: selection.marketType,
        selectionLabel: selection.selectionLabel,
        line: selection.line,
        priceDecimal: selection.priceDecimal,
        bookmaker: selection.bookmaker,
        fixtureLabel: selection.fixtureLabel,
        sortOrder: selection.sortOrder,
        metadata: selection.metadata,
      })),
    });

    return created.id;
  });

  return getCommunitySlipById(savedSlipId, {
    locale,
    currentUserId: userId,
  });
}

export async function toggleCommunitySlipLike({
  slipId,
  userId,
  locale = "en",
  shouldLike = true,
}) {
  if (!slipId || !userId) {
    throw new Error("You need an account to react to a slip.");
  }

  await db.$transaction(async (tx) => {
    const slip = await tx.communitySlip.findFirst({
      where: {
        id: slipId,
        status: "PUBLISHED",
        visibility: "PUBLIC",
      },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!slip) {
      throw new Error("Slip not found.");
    }

    if (slip.userId === userId) {
      throw new Error("You cannot like your own slip.");
    }

    const existing = await tx.communitySlipLike.findUnique({
      where: {
        communitySlipId_userId: {
          communitySlipId: slipId,
          userId,
        },
      },
      select: {
        userId: true,
      },
    });

    if (shouldLike && !existing) {
      await tx.communitySlipLike.create({
        data: {
          communitySlipId: slipId,
          userId,
        },
      });

      await tx.communitySlip.update({
        where: {
          id: slipId,
        },
        data: {
          likeCount: {
            increment: 1,
          },
        },
      });
    }

    if (!shouldLike && existing) {
      await tx.communitySlipLike.delete({
        where: {
          communitySlipId_userId: {
            communitySlipId: slipId,
            userId,
          },
        },
      });

      await tx.communitySlip.update({
        where: {
          id: slipId,
        },
        data: {
          likeCount: {
            decrement: 1,
          },
        },
      });
    }
  });

  return getCommunitySlipById(slipId, {
    locale,
    currentUserId: userId,
  });
}
