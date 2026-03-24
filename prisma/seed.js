require("dotenv/config");
const mysql = require("mysql2/promise");

function parseDatabaseUrl(url) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 3306,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace(/^\//, ""),
  };
}

function isoOffset(days = 0, hours = 0) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  date.setUTCHours(date.getUTCHours() + hours);
  return date.toISOString().slice(0, 19).replace("T", " ");
}

async function fetchSingleId(connection, table, whereClause, values) {
  const [rows] = await connection.query(
    `
    SELECT id
    FROM ${table}
    WHERE ${whereClause}
    LIMIT 1
    `,
    values
  );

  return rows[0]?.id || null;
}

async function fetchSingleRow(connection, table, whereClause, values, columns = "*") {
  const [rows] = await connection.query(
    `
    SELECT ${columns}
    FROM ${table}
    WHERE ${whereClause}
    LIMIT 1
    `,
    values
  );

  return rows[0] || null;
}

function toJson(value) {
  return value == null ? null : JSON.stringify(value);
}

async function upsertProviderRef(connection, entry) {
  const externalRef = entry.externalRef || entry.sourceCode;

  if (!entry.providerId || !entry.entityType || !entry.entityId || !externalRef) {
    return;
  }

  await connection.query(
    `
    UPDATE ProviderEntityRef
    SET isPrimary = false,
        updatedAt = NOW()
    WHERE providerId = ?
      AND entityType = ?
      AND entityId = ?
      AND externalRef <> ?
    `,
    [entry.providerId, entry.entityType, entry.entityId, externalRef]
  );

  await connection.query(
    `
    INSERT INTO ProviderEntityRef (
      id, providerId, entityType, entityId, externalRef, sourceCode, sourceName, feedFamily, role, tier, isPrimary, metadata, createdAt, updatedAt
    )
    VALUES (
      UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, true, ?, NOW(), NOW()
    )
    ON DUPLICATE KEY UPDATE
      entityId = VALUES(entityId),
      sourceCode = VALUES(sourceCode),
      sourceName = VALUES(sourceName),
      feedFamily = VALUES(feedFamily),
      role = VALUES(role),
      tier = VALUES(tier),
      isPrimary = true,
      metadata = VALUES(metadata),
      updatedAt = NOW()
    `,
    [
      entry.providerId,
      entry.entityType,
      entry.entityId,
      externalRef,
      entry.sourceCode || null,
      entry.sourceName || null,
      entry.feedFamily || null,
      entry.role || null,
      entry.tier || null,
      toJson(entry.metadata),
    ]
  );
}

async function seed() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set.");
  }

  const connection = await mysql.createConnection(parseDatabaseUrl(databaseUrl));
  try {
    await connection.beginTransaction();

    await connection.query(
      `
      INSERT INTO Role (id, name, description, createdAt, updatedAt)
      VALUES
        (UUID(), 'ADMIN', 'Full system access', NOW(), NOW()),
        (UUID(), 'EDITOR', 'Editorial and news curation access', NOW(), NOW()),
        (UUID(), 'USER', 'Standard app user', NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        description = VALUES(description),
        updatedAt = NOW()
      `
    );

    await connection.query(
      `
      INSERT INTO FeatureFlag (id, \`key\`, description, enabled, createdAt, updatedAt)
      VALUES
        (UUID(), 'scores_live_refresh', 'Enable live board refresh behavior', true, NOW(), NOW()),
        (UUID(), 'news_hub_enabled', 'Enable news mode and editorial modules', true, NOW(), NOW()),
        (UUID(), 'odds_surfaces_enabled', 'Enable informational odds surfaces', true, NOW(), NOW()),
        (UUID(), 'broadcast_surfaces_enabled', 'Enable broadcast guide surfaces', true, NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        description = VALUES(description),
        enabled = VALUES(enabled),
        updatedAt = NOW()
      `
    );

    await connection.query(
      `
      INSERT INTO ShellModule (
        id, \`key\`, name, location, description, isEnabled, emergencyDisabled, emergencyReason, metadata, createdAt, updatedAt
      )
      VALUES
        (
          UUID(), 'news_hub', 'News hub', 'news',
          'Top-level editorial hub and downstream linked modules.',
          true, false, NULL,
          JSON_OBJECT('surface', 'news'),
          NOW(), NOW()
        ),
        (
          UUID(), 'homepage_news_module', 'Homepage news module', 'home',
          'Compact homepage editorial strip.',
          true, false, NULL,
          JSON_OBJECT('surface', 'home'),
          NOW(), NOW()
        ),
        (
          UUID(), 'league_news_module', 'League news module', 'league',
          'Competition-linked news module.',
          true, false, NULL,
          JSON_OBJECT('surface', 'league'),
          NOW(), NOW()
        ),
        (
          UUID(), 'team_news_module', 'Team news module', 'team',
          'Team-linked news module.',
          true, false, NULL,
          JSON_OBJECT('surface', 'team'),
          NOW(), NOW()
        ),
        (
          UUID(), 'live_news_strip', 'Live news strip', 'live',
          'Latest news strip on the live scores board.',
          true, false, NULL,
          JSON_OBJECT('surface', 'live'),
          NOW(), NOW()
        ),
        (
          UUID(), 'results_news_strip', 'Results news strip', 'results',
          'Latest news strip on the results page.',
          true, false, NULL,
          JSON_OBJECT('surface', 'results'),
          NOW(), NOW()
        ),
        (
          UUID(), 'fixture_odds', 'Fixture odds', 'match',
          'Match-detail odds surface.',
          true, false, NULL,
          JSON_OBJECT('surface', 'match'),
          NOW(), NOW()
        ),
        (
          UUID(), 'competition_odds', 'Competition odds', 'league',
          'League-level odds tabs.',
          true, false, NULL,
          JSON_OBJECT('surface', 'league'),
          NOW(), NOW()
        ),
        (
          UUID(), 'fixture_broadcast', 'Fixture broadcast', 'match',
          'Match-detail broadcast guide.',
          true, false, NULL,
          JSON_OBJECT('surface', 'match'),
          NOW(), NOW()
        ),
        (
          UUID(), 'shell_right_rail_ad_slot', 'Right rail ad slot', 'shell',
          'Support slot in the public right rail.',
          true, false, NULL,
          JSON_OBJECT('surface', 'shell-right-rail'),
          NOW(), NOW()
        ),
        (
          UUID(), 'shell_right_rail_consent', 'Right rail consent', 'shell',
          'Consent and privacy copy in the public shell.',
          true, false, NULL,
          JSON_OBJECT('surface', 'shell-right-rail'),
          NOW(), NOW()
        ),
        (
          UUID(), 'shell_right_rail_support', 'Right rail support copy', 'shell',
          'Operational support explainer in the public shell.',
          true, false, NULL,
          JSON_OBJECT('surface', 'shell-right-rail'),
          NOW(), NOW()
        ),
        (
          UUID(), 'shell_right_rail_funnel_entry', 'Right rail funnel entry', 'shell',
          'Telegram and WhatsApp conversion entry points in the public shell.',
          true, false, NULL,
          JSON_OBJECT('surface', 'shell-right-rail'),
          NOW(), NOW()
        )
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        location = VALUES(location),
        description = VALUES(description),
        isEnabled = VALUES(isEnabled),
        emergencyDisabled = VALUES(emergencyDisabled),
        emergencyReason = VALUES(emergencyReason),
        metadata = VALUES(metadata),
        updatedAt = NOW()
      `
    );

    await connection.query(
      `
      INSERT INTO AdSlot (
        id, \`key\`, name, placement, size, copy, ctaLabel, ctaUrl, isEnabled, metadata, createdAt, updatedAt
      )
      VALUES
        (
          UUID(), 'shell_right_rail_primary', 'Right rail support slot', 'shell:right-rail', '300x250',
          'Sponsor-safe support placement for promos, house campaigns, or fallback inventory.',
          'View sponsor guide', 'https://example.com/sponsor-guide', true,
          JSON_OBJECT('tone', 'house'),
          NOW(), NOW()
        )
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        placement = VALUES(placement),
        size = VALUES(size),
        copy = VALUES(copy),
        ctaLabel = VALUES(ctaLabel),
        ctaUrl = VALUES(ctaUrl),
        isEnabled = VALUES(isEnabled),
        metadata = VALUES(metadata),
        updatedAt = NOW()
      `
    );

    await connection.query(
      `
      INSERT INTO ConsentText (
        id, \`key\`, locale, title, body, version, isActive, metadata, createdAt, updatedAt
      )
      VALUES
        (
          UUID(), 'shell_right_rail', 'en', 'Consent',
          'Consent, privacy, and regulated-content notices land in this rail without breaking the scores layout.',
          1, true,
          JSON_OBJECT('region', 'global'),
          NOW(), NOW()
        ),
        (
          UUID(), 'shell_right_rail', 'fr', 'Consentement',
          'Les mentions de consentement, de confidentialite et de contenu reglemente apparaissent ici sans casser la mise en page des scores.',
          1, true,
          JSON_OBJECT('region', 'global'),
          NOW(), NOW()
        ),
        (
          UUID(), 'shell_right_rail', 'sw', 'Idhini',
          'Ridhaa, faragha, na matangazo ya maudhui yaliyodhibitiwa yanaweza kuonekana hapa bila kuvunja mpangilio wa alama.',
          1, true,
          JSON_OBJECT('region', 'global'),
          NOW(), NOW()
        )
      ON DUPLICATE KEY UPDATE
        title = VALUES(title),
        body = VALUES(body),
        version = VALUES(version),
        isActive = VALUES(isActive),
        metadata = VALUES(metadata),
        updatedAt = NOW()
      `
    );

    await connection.query(
      `
      INSERT INTO SourceProvider (
        id, code, name, kind, family, namespace, role, tier, priority, fallbackProviderId, isActive, metadata, createdAt, updatedAt
      )
      VALUES
        (
          UUID(), 'SPORTSMONKS', 'SportsMonks Football', 'football-feed', 'sportsmonks', 'SPORTSMONKS', 'primary', 'live', 10, NULL, true,
          JSON_OBJECT('role', 'primary', 'tier', 'live', 'stage', 'live', 'sports', JSON_ARRAY('football')),
          NOW(), NOW()
        ),
        (
          UUID(), 'SPORTSMONKS_BASKETBALL', 'SportsMonks Basketball', 'basketball-feed', 'sportsmonks', 'SPORTSMONKS_BASKETBALL', 'expansion', 'planned', 40, NULL, false,
          JSON_OBJECT('role', 'expansion', 'tier', 'planned', 'stage', 'planned', 'sports', JSON_ARRAY('basketball')),
          NOW(), NOW()
        ),
        (
          UUID(), 'SPORTSMONKS_TENNIS', 'SportsMonks Tennis', 'tennis-feed', 'sportsmonks', 'SPORTSMONKS_TENNIS', 'expansion', 'planned', 50, NULL, false,
          JSON_OBJECT('role', 'expansion', 'tier', 'planned', 'stage', 'planned', 'sports', JSON_ARRAY('tennis')),
          NOW(), NOW()
        ),
        (
          UUID(), 'SCOREBOARD_BACKUP', 'Scoreboard Backup Feed', 'backup-feed', 'backup', 'SCOREBOARD_BACKUP', 'backup', 'prepared', 20, NULL, false,
          JSON_OBJECT(
            'role', 'backup',
            'tier', 'prepared',
            'stage', 'prepared',
            'sports', JSON_ARRAY('football', 'basketball', 'tennis'),
            'fallbackFor', JSON_ARRAY('SPORTSMONKS')
          ),
          NOW(), NOW()
        )
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          kind = VALUES(kind),
          family = VALUES(family),
          namespace = VALUES(namespace),
          role = VALUES(role),
          tier = VALUES(tier),
          priority = VALUES(priority),
          isActive = VALUES(isActive),
          metadata = VALUES(metadata),
          updatedAt = NOW()
      `
    );

    const sportsmonksProviderId = await fetchSingleId(
      connection,
      "SourceProvider",
      "code = 'SPORTSMONKS'",
      []
    );

    await connection.query(
      `
      UPDATE SourceProvider
      SET fallbackProviderId = CASE
        WHEN code = 'SCOREBOARD_BACKUP' THEN ?
        ELSE fallbackProviderId
      END,
      updatedAt = NOW()
      WHERE code IN ('SPORTSMONKS', 'SCOREBOARD_BACKUP')
      `,
      [sportsmonksProviderId]
    );

    const seedProviderRef = (entry) =>
      upsertProviderRef(connection, {
        providerId: sportsmonksProviderId,
        role: "primary",
        tier: "live",
        ...entry,
      });

    await connection.query(
      `
      INSERT INTO Sport (id, code, slug, name, isEnabled, createdAt, updatedAt)
      VALUES
        (UUID(), 'football', 'football', 'Football', true, NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        slug = VALUES(slug),
        name = VALUES(name),
        isEnabled = VALUES(isEnabled),
        updatedAt = NOW()
      `
    );

    const sportId = await fetchSingleId(connection, "Sport", "code = 'football'", []);

    await connection.query(
      `
      INSERT INTO Country (id, code, slug, name, createdAt, updatedAt)
      VALUES
        (UUID(), 'ENGLAND', 'england', 'England', NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        slug = VALUES(slug),
        name = VALUES(name),
        updatedAt = NOW()
      `
    );

    const countryId = await fetchSingleId(connection, "Country", "code = 'ENGLAND'", []);

    await connection.query(
      `
      INSERT INTO Competition (id, sportId, countryId, name, shortName, slug, code, externalRef, createdAt, updatedAt)
      VALUES
        (UUID(), ?, ?, 'Premier League', 'EPL', 'england-epl', 'EPL', 'seed-epl', NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        shortName = VALUES(shortName),
        updatedAt = NOW()
      `,
      [sportId, countryId]
    );

    const competitionId = await fetchSingleId(connection, "Competition", "code = 'EPL'", []);

    await connection.query(
      `
      INSERT INTO League (id, sportId, countryId, competitionId, provider, name, country, code, externalRef, isActive, createdAt, updatedAt)
      VALUES
        (UUID(), ?, ?, ?, 'SPORTSMONKS', 'Premier League', 'England', 'EPL', 'seed-epl', true, NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        sportId = VALUES(sportId),
        countryId = VALUES(countryId),
        competitionId = VALUES(competitionId),
        provider = VALUES(provider),
        country = VALUES(country),
        isActive = VALUES(isActive),
        updatedAt = NOW()
      `,
      [sportId, countryId, competitionId]
    );

    const leagueId = await fetchSingleId(connection, "League", "code = 'EPL'", []);

    await connection.query(
      `
      INSERT INTO Team (id, leagueId, competitionId, name, shortName, code, provider, externalRef, createdAt, updatedAt)
      VALUES
        (UUID(), ?, ?, 'Arsenal', 'ARS', 'ARS', 'SPORTSMONKS', 'seed-arsenal', NOW(), NOW()),
        (UUID(), ?, ?, 'Chelsea', 'CHE', 'CHE', 'SPORTSMONKS', 'seed-chelsea', NOW(), NOW()),
        (UUID(), ?, ?, 'Liverpool', 'LIV', 'LIV', 'SPORTSMONKS', 'seed-liverpool', NOW(), NOW()),
        (UUID(), ?, ?, 'Manchester City', 'MCI', 'MCI', 'SPORTSMONKS', 'seed-man-city', NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        shortName = VALUES(shortName),
        code = VALUES(code),
        competitionId = VALUES(competitionId),
        updatedAt = NOW()
      `,
      [leagueId, competitionId, leagueId, competitionId, leagueId, competitionId, leagueId, competitionId]
    );

    const arsenalId = await fetchSingleId(connection, "Team", "externalRef = 'seed-arsenal'", []);
    const chelseaId = await fetchSingleId(connection, "Team", "externalRef = 'seed-chelsea'", []);
    const liverpoolId = await fetchSingleId(connection, "Team", "externalRef = 'seed-liverpool'", []);
    const manCityId = await fetchSingleId(connection, "Team", "externalRef = 'seed-man-city'", []);

    await connection.query(
      `
      INSERT INTO Season (id, leagueId, competitionId, provider, name, externalRef, startDate, endDate, isCurrent, createdAt, updatedAt)
      VALUES
        (UUID(), ?, ?, 'SPORTSMONKS', '2025/2026', 'seed-season-2025-2026', '2025-08-01 00:00:00', '2026-05-31 00:00:00', true, NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        competitionId = VALUES(competitionId),
        isCurrent = VALUES(isCurrent),
        updatedAt = NOW()
      `,
      [leagueId, competitionId]
    );

    const seasonId = await fetchSingleId(connection, "Season", "externalRef = 'seed-season-2025-2026'", []);

    await connection.query(
      `
      INSERT INTO Stage (
        id, competitionId, seasonId, name, slug, code, externalRef, stageType, status, sortOrder, metadata, createdAt, updatedAt
      )
      VALUES
        (
          UUID(), ?, ?, 'Regular Season', 'regular-season', 'REG', 'seed-stage-regular-season',
          'REGULAR_SEASON', 'active', 1,
          JSON_OBJECT('provider', 'SPORTSMONKS', 'displayName', 'Regular Season'),
          NOW(), NOW()
        )
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        stageType = VALUES(stageType),
        status = VALUES(status),
        metadata = VALUES(metadata),
        updatedAt = NOW()
      `,
      [competitionId, seasonId]
    );

    const stageId = await fetchSingleId(
      connection,
      "Stage",
      "externalRef = 'seed-stage-regular-season'",
      []
    );

    await connection.query(
      `
      INSERT INTO Round (
        id, competitionId, seasonId, stageId, name, slug, code, externalRef, roundType, sequence, startsAt, endsAt, isCurrent, metadata, createdAt, updatedAt
      )
      VALUES
        (
          UUID(), ?, ?, ?, 'Round 29', 'round-29', 'R29', 'seed-round-29',
          'ROUND', 29, '2026-03-15 00:00:00', '2026-03-18 23:59:59', false,
          JSON_OBJECT('provider', 'SPORTSMONKS'),
          NOW(), NOW()
        ),
        (
          UUID(), ?, ?, ?, 'Round 30', 'round-30', 'R30', 'seed-round-30',
          'ROUND', 30, '2026-03-22 00:00:00', '2026-03-26 23:59:59', true,
          JSON_OBJECT('provider', 'SPORTSMONKS'),
          NOW(), NOW()
        )
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        roundType = VALUES(roundType),
        sequence = VALUES(sequence),
        startsAt = VALUES(startsAt),
        endsAt = VALUES(endsAt),
        isCurrent = VALUES(isCurrent),
        metadata = VALUES(metadata),
        updatedAt = NOW()
      `,
      [competitionId, seasonId, stageId, competitionId, seasonId, stageId]
    );

    const round29Id = await fetchSingleId(connection, "Round", "externalRef = 'seed-round-29'", []);
    const round30Id = await fetchSingleId(connection, "Round", "externalRef = 'seed-round-30'", []);

    await connection.query(
      `
      INSERT INTO Fixture (
        id, sportId, countryId, competitionId, leagueId, seasonId, stageId, roundId, homeTeamId, awayTeamId, provider,
        startsAt, status, venue, externalRef, round, stateReason, lastSyncedAt, createdAt, updatedAt
      )
      VALUES
        (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SPORTSMONKS', ?, 'LIVE', 'Emirates Stadium', 'seed-live-ars-che', 'Round 30', 'In Play', NOW(), NOW(), NOW()),
        (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SPORTSMONKS', ?, 'SCHEDULED', 'Etihad Stadium', 'seed-upcoming-mci-liv', 'Round 30', null, NOW(), NOW(), NOW()),
        (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SPORTSMONKS', ?, 'FINISHED', 'Stamford Bridge', 'seed-finished-che-ars', 'Round 29', 'Full Time', NOW(), NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        stageId = VALUES(stageId),
        roundId = VALUES(roundId),
        startsAt = VALUES(startsAt),
        status = VALUES(status),
        venue = VALUES(venue),
        round = VALUES(round),
        stateReason = VALUES(stateReason),
        updatedAt = NOW()
      `,
      [
        sportId, countryId, competitionId, leagueId, seasonId, stageId, round30Id, arsenalId, chelseaId, isoOffset(0, -1),
        sportId, countryId, competitionId, leagueId, seasonId, stageId, round30Id, manCityId, liverpoolId, isoOffset(1, 3),
        sportId, countryId, competitionId, leagueId, seasonId, stageId, round29Id, chelseaId, arsenalId, isoOffset(-1, 1),
      ]
    );

    const liveFixtureId = await fetchSingleId(connection, "Fixture", "externalRef = 'seed-live-ars-che'", []);
    const upcomingFixtureId = await fetchSingleId(connection, "Fixture", "externalRef = 'seed-upcoming-mci-liv'", []);
    const finishedFixtureId = await fetchSingleId(connection, "Fixture", "externalRef = 'seed-finished-che-ars'", []);

    await connection.query(
      `
      INSERT INTO ResultSnapshot (
        id, fixtureId, homeScore, awayScore, homePenaltyScore, awayPenaltyScore, phase, winnerSide, statusText, capturedAt, updatedAt
      )
      VALUES
        (UUID(), ?, 2, 1, NULL, NULL, 'SECOND_HALF', NULL, 'In Play', NOW(), NOW()),
        (UUID(), ?, 0, 0, NULL, NULL, 'PRE_MATCH', NULL, 'Scheduled', NOW(), NOW()),
        (UUID(), ?, 1, 3, NULL, NULL, 'FULL_TIME', 'AWAY', 'Full Time', NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        homeScore = VALUES(homeScore),
        awayScore = VALUES(awayScore),
        homePenaltyScore = VALUES(homePenaltyScore),
        awayPenaltyScore = VALUES(awayPenaltyScore),
        phase = VALUES(phase),
        winnerSide = VALUES(winnerSide),
        statusText = VALUES(statusText),
        capturedAt = NOW(),
        updatedAt = NOW()
      `,
      [liveFixtureId, upcomingFixtureId, finishedFixtureId]
    );

    await connection.query(
      `
      INSERT INTO Bookmaker (
        id, sourceProviderId, code, slug, name, shortName, websiteUrl, logoUrl, affiliateBaseUrl, isActive, metadata, createdAt, updatedAt
      )
      VALUES
        (
          UUID(), ?, 'PULSEBOOK', 'pulsebook', 'PulseBook', 'Pulse',
          'https://www.pulsebook.example', '/window.svg', 'https://www.pulsebook.example/join',
          true,
          JSON_OBJECT('launchGeos', JSON_ARRAY('UG', 'NG', 'US'), 'rating', 4.5),
          NOW(), NOW()
        ),
        (
          UUID(), ?, 'NORTHLINE', 'northline', 'NorthLine', 'North',
          'https://www.northline.example', '/globe.svg', 'https://www.northline.example/signup',
          true,
          JSON_OBJECT('launchGeos', JSON_ARRAY('GB', 'KE'), 'rating', 4.2),
          NOW(), NOW()
        )
      ON DUPLICATE KEY UPDATE
        sourceProviderId = VALUES(sourceProviderId),
        slug = VALUES(slug),
        name = VALUES(name),
        shortName = VALUES(shortName),
        websiteUrl = VALUES(websiteUrl),
        logoUrl = VALUES(logoUrl),
        affiliateBaseUrl = VALUES(affiliateBaseUrl),
        isActive = VALUES(isActive),
        metadata = VALUES(metadata),
        updatedAt = NOW()
      `,
      [sportsmonksProviderId, sportsmonksProviderId]
    );

    const pulseBookId = await fetchSingleId(connection, "Bookmaker", "code = 'PULSEBOOK'", []);
    const northLineId = await fetchSingleId(connection, "Bookmaker", "code = 'NORTHLINE'", []);

    await connection.query(
      `
      INSERT INTO OddsMarket (
        id, fixtureId, bookmakerId, provider, externalRef, bookmaker, marketType, suspended, lastSyncedAt, metadata, createdAt, updatedAt
      )
      VALUES
        (
          UUID(), ?, ?, 'SPORTSMONKS', 'seed-live-1x2', 'PulseBook', '1X2', false,
          DATE_SUB(NOW(), INTERVAL 40 MINUTE),
          JSON_OBJECT('allowedTerritories', JSON_ARRAY('US', 'UG')),
          NOW(), NOW()
        ),
        (
          UUID(), ?, ?, 'SPORTSMONKS', 'seed-live-goals', 'PulseBook', 'Over/Under 2.5', false,
          DATE_SUB(NOW(), INTERVAL 40 MINUTE),
          JSON_OBJECT('allowedTerritories', JSON_ARRAY('US', 'UG')),
          NOW(), NOW()
        ),
        (
          UUID(), ?, ?, 'SPORTSMONKS', 'seed-upcoming-1x2', 'NorthLine', '1X2', false,
          NOW(),
          JSON_OBJECT('allowedTerritories', JSON_ARRAY('GB')),
          NOW(), NOW()
        )
      ON DUPLICATE KEY UPDATE
        bookmakerId = VALUES(bookmakerId),
        bookmaker = VALUES(bookmaker),
        marketType = VALUES(marketType),
        suspended = VALUES(suspended),
        lastSyncedAt = VALUES(lastSyncedAt),
        metadata = VALUES(metadata),
        updatedAt = NOW()
      `,
      [
        liveFixtureId, pulseBookId,
        liveFixtureId, pulseBookId,
        upcomingFixtureId, northLineId,
      ]
    );

    const liveOneXTwoMarketId = await fetchSingleId(connection, "OddsMarket", "externalRef = 'seed-live-1x2'", []);
    const liveGoalsMarketId = await fetchSingleId(connection, "OddsMarket", "externalRef = 'seed-live-goals'", []);
    const upcomingOneXTwoMarketId = await fetchSingleId(
      connection,
      "OddsMarket",
      "externalRef = 'seed-upcoming-1x2'",
      []
    );

    await connection.query(
      `
      INSERT INTO OddsSelection (
        id, oddsMarketId, externalRef, label, line, priceDecimal, isActive, createdAt, updatedAt
      )
      VALUES
        (UUID(), ?, 'seed-live-1x2-home', 'Arsenal', NULL, 1.84, true, NOW(), NOW()),
        (UUID(), ?, 'seed-live-1x2-draw', 'Draw', NULL, 3.55, true, NOW(), NOW()),
        (UUID(), ?, 'seed-live-1x2-away', 'Chelsea', NULL, 4.60, true, NOW(), NOW()),
        (UUID(), ?, 'seed-live-ou-over', 'Over', 2.50, 1.91, true, NOW(), NOW()),
        (UUID(), ?, 'seed-live-ou-under', 'Under', 2.50, 1.96, true, NOW(), NOW()),
        (UUID(), ?, 'seed-upcoming-1x2-home', 'Manchester City', NULL, 1.72, true, NOW(), NOW()),
        (UUID(), ?, 'seed-upcoming-1x2-draw', 'Draw', NULL, 3.90, true, NOW(), NOW()),
        (UUID(), ?, 'seed-upcoming-1x2-away', 'Liverpool', NULL, 4.80, true, NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        label = VALUES(label),
        line = VALUES(line),
        priceDecimal = VALUES(priceDecimal),
        isActive = VALUES(isActive),
        updatedAt = NOW()
      `,
      [
        liveOneXTwoMarketId,
        liveOneXTwoMarketId,
        liveOneXTwoMarketId,
        liveGoalsMarketId,
        liveGoalsMarketId,
        upcomingOneXTwoMarketId,
        upcomingOneXTwoMarketId,
        upcomingOneXTwoMarketId,
        ]
      );

    await connection.query(
      `
      INSERT INTO AffiliateLink (
        id, bookmakerId, \`key\`, code, territory, locale, surface, linkType, destinationUrl, trackingTemplate, fallbackUrl, isDefault, isActive, priority, metadata, createdAt, updatedAt
      )
      VALUES
        (
          UUID(), ?, 'pulsebook_home_ug', 'PULSEBOOK_HOME_UG', 'UG', 'en', 'HOME', 'CPA',
          'https://www.pulsebook.example/join?surface=home&geo=UG',
          'aff_id=pulsebook-home-ug', 'https://www.pulsebook.example',
          true, true, 10,
          JSON_OBJECT('partner', 'PulseBook', 'surface', 'home'),
          NOW(), NOW()
        ),
        (
          UUID(), ?, 'pulsebook_match_ug', 'PULSEBOOK_MATCH_UG', 'UG', 'en', 'MATCH', 'CPA',
          'https://www.pulsebook.example/join?surface=match&geo=UG',
          'aff_id=pulsebook-match-ug', 'https://www.pulsebook.example',
          false, true, 15,
          JSON_OBJECT('partner', 'PulseBook', 'surface', 'match'),
          NOW(), NOW()
        ),
        (
          UUID(), ?, 'northline_competition_gb', 'NORTHLINE_COMP_GB', 'GB', 'en', 'COMPETITION', 'REV_SHARE',
          'https://www.northline.example/signup?surface=competition&geo=GB',
          'aff_id=northline-comp-gb', 'https://www.northline.example',
          true, true, 12,
          JSON_OBJECT('partner', 'NorthLine', 'surface', 'competition'),
          NOW(), NOW()
        ),
        (
          UUID(), ?, 'pulsebook_shell_ug', 'PULSEBOOK_SHELL_UG', 'UG', 'en', 'SHELL', 'CPA',
          'https://www.pulsebook.example/join?surface=shell&geo=UG',
          'aff_id=pulsebook-shell-ug', 'https://www.pulsebook.example',
          false, true, 20,
          JSON_OBJECT('partner', 'PulseBook', 'surface', 'shell'),
          NOW(), NOW()
        )
      ON DUPLICATE KEY UPDATE
        territory = VALUES(territory),
        locale = VALUES(locale),
        surface = VALUES(surface),
        linkType = VALUES(linkType),
        destinationUrl = VALUES(destinationUrl),
        trackingTemplate = VALUES(trackingTemplate),
        fallbackUrl = VALUES(fallbackUrl),
        isDefault = VALUES(isDefault),
        isActive = VALUES(isActive),
        priority = VALUES(priority),
        metadata = VALUES(metadata),
        updatedAt = NOW()
      `,
      [pulseBookId, pulseBookId, northLineId, pulseBookId]
    );

    const pulseBookHomeLinkId = await fetchSingleId(
      connection,
      "AffiliateLink",
      "`key` = 'pulsebook_home_ug'",
      []
    );
    const pulseBookMatchLinkId = await fetchSingleId(
      connection,
      "AffiliateLink",
      "`key` = 'pulsebook_match_ug'",
      []
    );
    const northLineCompetitionLinkId = await fetchSingleId(
      connection,
      "AffiliateLink",
      "`key` = 'northline_competition_gb'",
      []
    );
    const pulseBookShellLinkId = await fetchSingleId(
      connection,
      "AffiliateLink",
      "`key` = 'pulsebook_shell_ug'",
      []
    );

    await connection.query(
      `
      INSERT INTO FunnelEntry (
        id, \`key\`, channel, surface, title, description, ctaLabel, ctaUrl, territory, enabledGeos, isActive, priority, metadata, createdAt, updatedAt
      )
      VALUES
        (
          UUID(), 'shell_telegram_ug', 'telegram', 'SHELL', 'Telegram insider feed',
          'Opt into the Telegram funnel for score alerts, promo windows, and retention experiments.',
          'Open Telegram', 'https://t.me/sports_seed_ug', 'UG',
          JSON_ARRAY('UG', 'KE', 'NG'), true, 10,
          JSON_OBJECT('channel', 'telegram'),
          NOW(), NOW()
        ),
        (
          UUID(), 'shell_whatsapp_ug', 'whatsapp', 'SHELL', 'WhatsApp match picks',
          'Route WhatsApp CTAs through geo-safe messaging entry points without changing the shell layout.',
          'Open WhatsApp', 'https://wa.me/256700000000', 'UG',
          JSON_ARRAY('UG', 'KE', 'NG'), true, 20,
          JSON_OBJECT('channel', 'whatsapp'),
          NOW(), NOW()
        )
      ON DUPLICATE KEY UPDATE
        channel = VALUES(channel),
        surface = VALUES(surface),
        title = VALUES(title),
        description = VALUES(description),
        ctaLabel = VALUES(ctaLabel),
        ctaUrl = VALUES(ctaUrl),
        territory = VALUES(territory),
        enabledGeos = VALUES(enabledGeos),
        isActive = VALUES(isActive),
        priority = VALUES(priority),
        metadata = VALUES(metadata),
        updatedAt = NOW()
      `
    );

    const telegramFunnelId = await fetchSingleId(connection, "FunnelEntry", "`key` = 'shell_telegram_ug'", []);
    const whatsappFunnelId = await fetchSingleId(connection, "FunnelEntry", "`key` = 'shell_whatsapp_ug'", []);

    await connection.query(
      `
      INSERT INTO PredictionRecommendation (
        id, sourceProviderId, fixtureId, competitionId, teamId, bookmakerId, \`key\`, recommendationType, title, summary, marketType, selectionLabel, line, priceDecimal, confidence, edgeScore, isPublished, publishedAt, expiresAt, metadata, createdAt, updatedAt
      )
      VALUES
        (
          UUID(), ?, ?, ?, ?, ?, 'match-arsenal-win-pick', 'PICK',
          'Arsenal lean against Chelsea',
          'A home-lean sample recommendation for the live match surface with bookmaker and confidence metadata.',
          '1X2', 'Arsenal', NULL, 1.84, 68, 5.40, true, DATE_SUB(NOW(), INTERVAL 45 MINUTE), DATE_ADD(NOW(), INTERVAL 1 DAY),
          JSON_OBJECT('surface', 'match', 'geo', 'UG'),
          NOW(), NOW()
        ),
        (
          UUID(), ?, NULL, ?, NULL, ?, 'competition-top-four-value', 'INSIGHT',
          'Premier League run-in value angle',
          'Competition-level recommendation sample for monetized league surfaces and ranking slots.',
          'Top 4 Finish', 'Arsenal', NULL, 1.62, 61, 3.15, true, DATE_SUB(NOW(), INTERVAL 6 HOUR), DATE_ADD(NOW(), INTERVAL 2 DAY),
          JSON_OBJECT('surface', 'competition', 'geo', 'GB'),
          NOW(), NOW()
        )
      ON DUPLICATE KEY UPDATE
        sourceProviderId = VALUES(sourceProviderId),
        fixtureId = VALUES(fixtureId),
        competitionId = VALUES(competitionId),
        teamId = VALUES(teamId),
        bookmakerId = VALUES(bookmakerId),
        recommendationType = VALUES(recommendationType),
        title = VALUES(title),
        summary = VALUES(summary),
        marketType = VALUES(marketType),
        selectionLabel = VALUES(selectionLabel),
        line = VALUES(line),
        priceDecimal = VALUES(priceDecimal),
        confidence = VALUES(confidence),
        edgeScore = VALUES(edgeScore),
        isPublished = VALUES(isPublished),
        publishedAt = VALUES(publishedAt),
        expiresAt = VALUES(expiresAt),
        metadata = VALUES(metadata),
        updatedAt = NOW()
      `,
      [
        sportsmonksProviderId, liveFixtureId, competitionId, arsenalId, pulseBookId,
        sportsmonksProviderId, competitionId, northLineId,
      ]
    );

    const matchPredictionId = await fetchSingleId(
      connection,
      "PredictionRecommendation",
      "`key` = 'match-arsenal-win-pick'",
      []
    );
    const competitionPredictionId = await fetchSingleId(
      connection,
      "PredictionRecommendation",
      "`key` = 'competition-top-four-value'",
      []
    );

    await connection.query(
      `
      INSERT INTO MonetizationPlacement (
        id, \`key\`, surface, slotKey, placementType, targetEntityType, targetEntityId, bookmakerId, affiliateLinkId, funnelEntryId, predictionRecommendationId, adSlotId, shellModuleId, title, description, priority, isActive, startsAt, endsAt, metadata, createdAt, updatedAt
      )
      VALUES
        (
          UUID(), 'home-featured-partner', 'HOME', 'home:hero:partner', 'AFFILIATE', NULL, NULL,
          ?, ?, NULL, NULL, NULL, NULL,
          'PulseBook launch partner', 'Homepage partner sample anchored to the affiliate rail.',
          10, true, NOW(), DATE_ADD(NOW(), INTERVAL 14 DAY),
          JSON_OBJECT('geo', 'UG'),
          NOW(), NOW()
        ),
        (
          UUID(), 'competition-partner-slot', 'COMPETITION', 'competition:hero:partner', 'AFFILIATE', 'COMPETITION', ?,
          ?, ?, NULL, NULL, NULL, NULL,
          'NorthLine title-race offer', 'Competition placement mapped directly to the Premier League surface.',
          15, true, NOW(), DATE_ADD(NOW(), INTERVAL 14 DAY),
          JSON_OBJECT('geo', 'GB'),
          NOW(), NOW()
        ),
        (
          UUID(), 'match-prediction-slot', 'MATCH', 'match:insight:prediction', 'PREDICTION', 'FIXTURE', ?,
          ?, ?, NULL, ?, NULL, NULL,
          'Model pick', 'Match detail prediction card wired to recommendation records.',
          12, true, NOW(), DATE_ADD(NOW(), INTERVAL 2 DAY),
          JSON_OBJECT('geo', 'UG'),
          NOW(), NOW()
        ),
        (
          UUID(), 'shell-telegram-slot', 'SHELL', 'shell:right-rail:funnel', 'FUNNEL', NULL, NULL,
          NULL, ?, ?, NULL, NULL, NULL,
          'Telegram funnel', 'Shell rail funnel slot backed by DB-managed CTA entries.',
          8, true, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY),
          JSON_OBJECT('geo', 'UG'),
          NOW(), NOW()
        ),
        (
          UUID(), 'shell-whatsapp-slot', 'SHELL', 'shell:right-rail:funnel', 'FUNNEL', NULL, NULL,
          NULL, NULL, ?, NULL, NULL, NULL,
          'WhatsApp funnel', 'Secondary shell rail funnel slot for WhatsApp retention journeys.',
          9, true, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY),
          JSON_OBJECT('geo', 'UG'),
          NOW(), NOW()
        )
      ON DUPLICATE KEY UPDATE
        surface = VALUES(surface),
        slotKey = VALUES(slotKey),
        placementType = VALUES(placementType),
        targetEntityType = VALUES(targetEntityType),
        targetEntityId = VALUES(targetEntityId),
        bookmakerId = VALUES(bookmakerId),
        affiliateLinkId = VALUES(affiliateLinkId),
        funnelEntryId = VALUES(funnelEntryId),
        predictionRecommendationId = VALUES(predictionRecommendationId),
        title = VALUES(title),
        description = VALUES(description),
        priority = VALUES(priority),
        isActive = VALUES(isActive),
        startsAt = VALUES(startsAt),
        endsAt = VALUES(endsAt),
        metadata = VALUES(metadata),
        updatedAt = NOW()
      `,
      [
        pulseBookId, pulseBookHomeLinkId,
        competitionId, northLineId, northLineCompetitionLinkId,
        liveFixtureId, pulseBookId, pulseBookMatchLinkId, matchPredictionId,
        pulseBookShellLinkId, telegramFunnelId,
        whatsappFunnelId,
      ]
    );

    await connection.query(
      `
      DELETE FROM ConversionEvent
      WHERE externalRef = 'seed-conversion-001'
      `
    );

    await connection.query(
      `
      DELETE FROM ClickEvent
      WHERE requestId = 'seed-request-001'
      `
    );

    await connection.query(
      `
      INSERT INTO ClickEvent (
        id, affiliateLinkId, bookmakerId, fixtureId, competitionId, geo, locale, surface, slotKey, targetEntityType, targetEntityId, sessionId, requestId, referrerUrl, targetUrl, metadata, createdAt
      )
      VALUES
        (
          UUID(), ?, ?, ?, ?, 'UG', 'en', 'MATCH', 'match:insight:prediction', 'FIXTURE', ?,
          'seed-session-001', 'seed-request-001', 'https://localhost:3000/en/match/seed-live-ars-che',
          'https://www.pulsebook.example/join?surface=match&geo=UG',
          JSON_OBJECT('seed', true, 'channel', 'web'),
          NOW()
        )
      `,
      [pulseBookMatchLinkId, pulseBookId, liveFixtureId, competitionId, liveFixtureId]
    );

    const clickEventId = await fetchSingleId(
      connection,
      "ClickEvent",
      "requestId = 'seed-request-001'",
      []
    );

    await connection.query(
      `
      INSERT INTO ConversionEvent (
        id, affiliateLinkId, bookmakerId, clickEventId, fixtureId, competitionId, geo, locale, surface, targetEntityType, targetEntityId, externalRef, status, currency, amount, revenue, convertedAt, metadata, createdAt, updatedAt
      )
      VALUES
        (
          UUID(), ?, ?, ?, ?, ?, 'UG', 'en', 'MATCH', 'FIXTURE', ?,
          'seed-conversion-001', 'APPROVED', 'USD', 25.00, 6.25, DATE_SUB(NOW(), INTERVAL 20 MINUTE),
          JSON_OBJECT('seed', true, 'partner', 'PulseBook'),
          NOW(), NOW()
        )
      ON DUPLICATE KEY UPDATE
        affiliateLinkId = VALUES(affiliateLinkId),
        bookmakerId = VALUES(bookmakerId),
        clickEventId = VALUES(clickEventId),
        fixtureId = VALUES(fixtureId),
        competitionId = VALUES(competitionId),
        status = VALUES(status),
        amount = VALUES(amount),
        revenue = VALUES(revenue),
        convertedAt = VALUES(convertedAt),
        metadata = VALUES(metadata),
        updatedAt = NOW()
      `,
      [pulseBookMatchLinkId, pulseBookId, clickEventId, liveFixtureId, competitionId, liveFixtureId]
    );

    await connection.query(
      `
      DELETE FROM BroadcastChannel
      WHERE fixtureId IN (?, ?)
      `,
      [liveFixtureId, upcomingFixtureId]
    );

    await connection.query(
      `
      INSERT INTO BroadcastChannel (
        id, fixtureId, externalRef, sourceCode, name, territory, channelType, url, isActive, metadata, createdAt, updatedAt
      )
      VALUES
        (
          UUID(), ?, 'seed-nbc-sports', 'NBC_US', 'NBC Sports', 'US', 'tv', 'https://www.nbcsports.com', true,
          JSON_OBJECT('countries', JSON_ARRAY(JSON_OBJECT('code', 'US'))),
          NOW(), NOW()
        ),
        (
          UUID(), ?, 'seed-peacock', 'PEACOCK_US', 'Peacock', 'US', 'streaming', 'https://www.peacocktv.com', true,
          JSON_OBJECT('countries', JSON_ARRAY(JSON_OBJECT('code', 'US'))),
          NOW(), NOW()
        ),
        (
          UUID(), ?, 'seed-sky-main-event', 'SKY_GB', 'Sky Sports Main Event', 'GB', 'tv', 'https://www.skysports.com', true,
          JSON_OBJECT('countries', JSON_ARRAY(JSON_OBJECT('code', 'GB'))),
          NOW(), NOW()
        )
      `,
      [liveFixtureId, liveFixtureId, upcomingFixtureId]
    );

    await connection.query(
      `
      INSERT INTO Standing (
        id, seasonId, competitionId, stageId, roundId, fixtureId, teamId, scope, groupName,
        position, played, won, drawn, lost, goalsFor, goalsAgainst, points, metadata, createdAt, updatedAt
      )
      VALUES
        (UUID(), ?, ?, ?, ?, NULL, ?, 'OVERALL', '', 1, 29, 21, 5, 3, 64, 27, 68, JSON_OBJECT('provider', 'SPORTSMONKS', 'table', 'overall'), NOW(), NOW()),
        (UUID(), ?, ?, ?, ?, NULL, ?, 'OVERALL', '', 2, 29, 20, 4, 5, 62, 29, 64, JSON_OBJECT('provider', 'SPORTSMONKS', 'table', 'overall'), NOW(), NOW()),
        (UUID(), ?, ?, ?, ?, NULL, ?, 'OVERALL', '', 3, 29, 16, 7, 6, 54, 33, 55, JSON_OBJECT('provider', 'SPORTSMONKS', 'table', 'overall'), NOW(), NOW()),
        (UUID(), ?, ?, ?, ?, NULL, ?, 'OVERALL', '', 4, 29, 15, 8, 6, 52, 31, 53, JSON_OBJECT('provider', 'SPORTSMONKS', 'table', 'overall'), NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        competitionId = VALUES(competitionId),
        stageId = VALUES(stageId),
        roundId = VALUES(roundId),
        fixtureId = VALUES(fixtureId),
        scope = VALUES(scope),
        groupName = VALUES(groupName),
        position = VALUES(position),
        played = VALUES(played),
        won = VALUES(won),
        drawn = VALUES(drawn),
        lost = VALUES(lost),
        goalsFor = VALUES(goalsFor),
        goalsAgainst = VALUES(goalsAgainst),
        points = VALUES(points),
        metadata = VALUES(metadata),
        updatedAt = NOW()
      `,
      [
        seasonId, competitionId, stageId, round29Id, arsenalId,
        seasonId, competitionId, stageId, round29Id, manCityId,
        seasonId, competitionId, stageId, round29Id, liverpoolId,
        seasonId, competitionId, stageId, round29Id, chelseaId,
      ]
    );

    const liveHomeSelectionId = await fetchSingleId(
      connection,
      "OddsSelection",
      "externalRef = 'seed-live-1x2-home'",
      []
    );
    const liveDrawSelectionId = await fetchSingleId(
      connection,
      "OddsSelection",
      "externalRef = 'seed-live-1x2-draw'",
      []
    );
    const liveAwaySelectionId = await fetchSingleId(
      connection,
      "OddsSelection",
      "externalRef = 'seed-live-1x2-away'",
      []
    );
    const liveOverSelectionId = await fetchSingleId(
      connection,
      "OddsSelection",
      "externalRef = 'seed-live-ou-over'",
      []
    );
    const liveUnderSelectionId = await fetchSingleId(
      connection,
      "OddsSelection",
      "externalRef = 'seed-live-ou-under'",
      []
    );
    const upcomingHomeSelectionId = await fetchSingleId(
      connection,
      "OddsSelection",
      "externalRef = 'seed-upcoming-1x2-home'",
      []
    );
    const upcomingDrawSelectionId = await fetchSingleId(
      connection,
      "OddsSelection",
      "externalRef = 'seed-upcoming-1x2-draw'",
      []
    );
    const upcomingAwaySelectionId = await fetchSingleId(
      connection,
      "OddsSelection",
      "externalRef = 'seed-upcoming-1x2-away'",
      []
    );
    const nbcSportsChannelId = await fetchSingleId(
      connection,
      "BroadcastChannel",
      "externalRef = 'seed-nbc-sports'",
      []
    );
    const peacockChannelId = await fetchSingleId(
      connection,
      "BroadcastChannel",
      "externalRef = 'seed-peacock'",
      []
    );
    const skyMainEventChannelId = await fetchSingleId(
      connection,
      "BroadcastChannel",
      "externalRef = 'seed-sky-main-event'",
      []
    );

    for (const entry of [
      {
        entityType: "SPORT",
        entityId: sportId,
        externalRef: "football",
        sourceCode: "football",
        sourceName: "Football",
        feedFamily: "taxonomy",
        metadata: { seeded: true },
      },
      {
        entityType: "COUNTRY",
        entityId: countryId,
        externalRef: "ENGLAND",
        sourceCode: "ENGLAND",
        sourceName: "England",
        feedFamily: "taxonomy",
        metadata: { seeded: true },
      },
      {
        entityType: "COMPETITION",
        entityId: competitionId,
        externalRef: "seed-epl",
        sourceCode: "EPL",
        sourceName: "Premier League",
        feedFamily: "taxonomy",
        metadata: { seeded: true },
      },
      {
        entityType: "LEAGUE",
        entityId: leagueId,
        externalRef: "seed-epl",
        sourceCode: "EPL",
        sourceName: "Premier League",
        feedFamily: "taxonomy",
        metadata: { seeded: true },
      },
      {
        entityType: "SEASON",
        entityId: seasonId,
        externalRef: "seed-season-2025-2026",
        sourceCode: "2025/2026",
        sourceName: "2025/2026",
        feedFamily: "taxonomy",
        metadata: { seeded: true, isCurrent: true },
      },
      {
        entityType: "STAGE",
        entityId: stageId,
        externalRef: "seed-stage-regular-season",
        sourceCode: "REG",
        sourceName: "Regular Season",
        feedFamily: "taxonomy",
        metadata: { seeded: true, stageType: "REGULAR_SEASON" },
      },
      {
        entityType: "ROUND",
        entityId: round29Id,
        externalRef: "seed-round-29",
        sourceCode: "R29",
        sourceName: "Round 29",
        feedFamily: "taxonomy",
        metadata: { seeded: true, sequence: 29 },
      },
      {
        entityType: "ROUND",
        entityId: round30Id,
        externalRef: "seed-round-30",
        sourceCode: "R30",
        sourceName: "Round 30",
        feedFamily: "taxonomy",
        metadata: { seeded: true, sequence: 30 },
      },
      {
        entityType: "TEAM",
        entityId: arsenalId,
        externalRef: "seed-arsenal",
        sourceCode: "ARS",
        sourceName: "Arsenal",
        feedFamily: "taxonomy",
        metadata: { seeded: true },
      },
      {
        entityType: "TEAM",
        entityId: chelseaId,
        externalRef: "seed-chelsea",
        sourceCode: "CHE",
        sourceName: "Chelsea",
        feedFamily: "taxonomy",
        metadata: { seeded: true },
      },
      {
        entityType: "TEAM",
        entityId: liverpoolId,
        externalRef: "seed-liverpool",
        sourceCode: "LIV",
        sourceName: "Liverpool",
        feedFamily: "taxonomy",
        metadata: { seeded: true },
      },
      {
        entityType: "TEAM",
        entityId: manCityId,
        externalRef: "seed-man-city",
        sourceCode: "MCI",
        sourceName: "Manchester City",
        feedFamily: "taxonomy",
        metadata: { seeded: true },
      },
      {
        entityType: "FIXTURE",
        entityId: liveFixtureId,
        externalRef: "seed-live-ars-che",
        sourceCode: "seed-live-ars-che",
        sourceName: "Arsenal vs Chelsea",
        feedFamily: "fixtures",
        metadata: { seeded: true, status: "LIVE" },
      },
      {
        entityType: "FIXTURE",
        entityId: upcomingFixtureId,
        externalRef: "seed-upcoming-mci-liv",
        sourceCode: "seed-upcoming-mci-liv",
        sourceName: "Manchester City vs Liverpool",
        feedFamily: "fixtures",
        metadata: { seeded: true, status: "SCHEDULED" },
      },
      {
        entityType: "FIXTURE",
        entityId: finishedFixtureId,
        externalRef: "seed-finished-che-ars",
        sourceCode: "seed-finished-che-ars",
        sourceName: "Chelsea vs Arsenal",
        feedFamily: "fixtures",
        metadata: { seeded: true, status: "FINISHED" },
      },
      {
        entityType: "BOOKMAKER",
        entityId: pulseBookId,
        externalRef: "PULSEBOOK",
        sourceCode: "PULSEBOOK",
        sourceName: "PulseBook",
        feedFamily: "odds",
        metadata: { seeded: true },
      },
      {
        entityType: "BOOKMAKER",
        entityId: northLineId,
        externalRef: "NORTHLINE",
        sourceCode: "NORTHLINE",
        sourceName: "NorthLine",
        feedFamily: "odds",
        metadata: { seeded: true },
      },
      {
        entityType: "ODDS_MARKET",
        entityId: liveOneXTwoMarketId,
        externalRef: "seed-live-1x2",
        sourceCode: "PulseBook:1X2",
        sourceName: "1X2",
        feedFamily: "odds",
        metadata: { seeded: true },
      },
      {
        entityType: "ODDS_MARKET",
        entityId: liveGoalsMarketId,
        externalRef: "seed-live-goals",
        sourceCode: "PulseBook:Over/Under 2.5",
        sourceName: "Over/Under 2.5",
        feedFamily: "odds",
        metadata: { seeded: true },
      },
      {
        entityType: "ODDS_MARKET",
        entityId: upcomingOneXTwoMarketId,
        externalRef: "seed-upcoming-1x2",
        sourceCode: "NorthLine:1X2",
        sourceName: "1X2",
        feedFamily: "odds",
        metadata: { seeded: true },
      },
      {
        entityType: "ODDS_SELECTION",
        entityId: liveHomeSelectionId,
        externalRef: "seed-live-1x2-home",
        sourceCode: "Arsenal:base",
        sourceName: "Arsenal",
        feedFamily: "odds",
        metadata: { seeded: true },
      },
      {
        entityType: "ODDS_SELECTION",
        entityId: liveDrawSelectionId,
        externalRef: "seed-live-1x2-draw",
        sourceCode: "Draw:base",
        sourceName: "Draw",
        feedFamily: "odds",
        metadata: { seeded: true },
      },
      {
        entityType: "ODDS_SELECTION",
        entityId: liveAwaySelectionId,
        externalRef: "seed-live-1x2-away",
        sourceCode: "Chelsea:base",
        sourceName: "Chelsea",
        feedFamily: "odds",
        metadata: { seeded: true },
      },
      {
        entityType: "ODDS_SELECTION",
        entityId: liveOverSelectionId,
        externalRef: "seed-live-ou-over",
        sourceCode: "Over:2.5",
        sourceName: "Over",
        feedFamily: "odds",
        metadata: { seeded: true },
      },
      {
        entityType: "ODDS_SELECTION",
        entityId: liveUnderSelectionId,
        externalRef: "seed-live-ou-under",
        sourceCode: "Under:2.5",
        sourceName: "Under",
        feedFamily: "odds",
        metadata: { seeded: true },
      },
      {
        entityType: "ODDS_SELECTION",
        entityId: upcomingHomeSelectionId,
        externalRef: "seed-upcoming-1x2-home",
        sourceCode: "Manchester City:base",
        sourceName: "Manchester City",
        feedFamily: "odds",
        metadata: { seeded: true },
      },
      {
        entityType: "ODDS_SELECTION",
        entityId: upcomingDrawSelectionId,
        externalRef: "seed-upcoming-1x2-draw",
        sourceCode: "Draw:base",
        sourceName: "Draw",
        feedFamily: "odds",
        metadata: { seeded: true },
      },
      {
        entityType: "ODDS_SELECTION",
        entityId: upcomingAwaySelectionId,
        externalRef: "seed-upcoming-1x2-away",
        sourceCode: "Liverpool:base",
        sourceName: "Liverpool",
        feedFamily: "odds",
        metadata: { seeded: true },
      },
      {
        entityType: "BROADCAST_CHANNEL",
        entityId: nbcSportsChannelId,
        externalRef: "seed-nbc-sports",
        sourceCode: "NBC_US",
        sourceName: "NBC Sports",
        feedFamily: "broadcast",
        metadata: { seeded: true },
      },
      {
        entityType: "BROADCAST_CHANNEL",
        entityId: peacockChannelId,
        externalRef: "seed-peacock",
        sourceCode: "PEACOCK_US",
        sourceName: "Peacock",
        feedFamily: "broadcast",
        metadata: { seeded: true },
      },
      {
        entityType: "BROADCAST_CHANNEL",
        entityId: skyMainEventChannelId,
        externalRef: "seed-sky-main-event",
        sourceCode: "SKY_GB",
        sourceName: "Sky Sports Main Event",
        feedFamily: "broadcast",
        metadata: { seeded: true },
      },
      {
        entityType: "PREDICTION_RECOMMENDATION",
        entityId: matchPredictionId,
        externalRef: "match-arsenal-win-pick",
        sourceCode: "PICK",
        sourceName: "Arsenal lean against Chelsea",
        feedFamily: "predictions",
        metadata: { seeded: true, surface: "match" },
      },
      {
        entityType: "PREDICTION_RECOMMENDATION",
        entityId: competitionPredictionId,
        externalRef: "competition-top-four-value",
        sourceCode: "INSIGHT",
        sourceName: "Premier League run-in value angle",
        feedFamily: "predictions",
        metadata: { seeded: true, surface: "competition" },
      },
    ]) {
      await seedProviderRef(entry);
    }

    await connection.query(
      `
      INSERT INTO NewsCategory (id, slug, name, createdAt, updatedAt)
      VALUES
        (UUID(), 'title-race', 'Title Race', NOW(), NOW()),
        (UUID(), 'match-analysis', 'Match Analysis', NOW(), NOW()),
        (UUID(), 'club-watch', 'Club Watch', NOW(), NOW()),
        (UUID(), 'transfer-watch', 'Transfer Watch', NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        updatedAt = NOW()
      `
    );

    const titleRaceCategoryId = await fetchSingleId(connection, "NewsCategory", "slug = 'title-race'", []);
    const matchAnalysisCategoryId = await fetchSingleId(
      connection,
      "NewsCategory",
      "slug = 'match-analysis'",
      []
    );
    const clubWatchCategoryId = await fetchSingleId(connection, "NewsCategory", "slug = 'club-watch'", []);
    const transferWatchCategoryId = await fetchSingleId(
      connection,
      "NewsCategory",
      "slug = 'transfer-watch'",
      []
    );

    await connection.query(
      `
      INSERT INTO NewsArticle (
        id, categoryId, slug, title, excerpt, body, status, sourceUrl, imageUrl, publishedAt, metadata, createdAt, updatedAt
      )
      VALUES
        (
          UUID(), ?, 'arsenal-keep-pressure-on-title-race',
          'Arsenal keep pressure on the title race after edging Chelsea',
          'A composed second-half spell and another sharp Saka moment kept Arsenal attached to the top of the Premier League picture.',
          ?,
          'PUBLISHED',
          'https://example.com/news/arsenal-title-race',
          '/window.svg',
          DATE_SUB(NOW(), INTERVAL 3 HOUR),
          JSON_OBJECT('topicLabel', 'Title race', 'hero', true, 'homepagePlacement', true),
          NOW(), NOW()
        ),
        (
          UUID(), ?, 'manchester-city-v-liverpool-preview-run-in-swing-match',
          'Manchester City v Liverpool preview: the swing match of the run-in',
          'Sunday''s heavyweight meeting could redraw the Champions League and title race conversation in one evening.',
          ?,
          'PUBLISHED',
          'https://example.com/news/man-city-liverpool-preview',
          '/globe.svg',
          DATE_SUB(NOW(), INTERVAL 6 HOUR),
          JSON_OBJECT('topicLabel', 'Matchday', 'homepagePlacement', true),
          NOW(), NOW()
        ),
        (
          UUID(), ?, 'chelsea-search-for-response-after-late-collapse',
          'Chelsea search for a response after another late collapse',
          'The shape is improving, but Chelsea still leave themselves too much to do when control turns into panic.',
          ?,
          'PUBLISHED',
          'https://example.com/news/chelsea-response',
          '/next.svg',
          DATE_SUB(NOW(), INTERVAL 10 HOUR),
          JSON_OBJECT('topicLabel', 'Club watch', 'homepagePlacement', false),
          NOW(), NOW()
        ),
        (
          UUID(), ?, 'premier-league-table-tightens-after-march-surge',
          'Premier League table tightens after the March surge',
          'A cluster of wins at the top has compressed the table and raised the pressure on every direct meeting left on the calendar.',
          ?,
          'PUBLISHED',
          'https://example.com/news/premier-league-table-tightens',
          '/vercel.svg',
          DATE_SUB(NOW(), INTERVAL 1 DAY),
          JSON_OBJECT('topicLabel', 'Title race', 'homepagePlacement', true),
          NOW(), NOW()
        ),
        (
          UUID(), ?, 'editor-notebook-arsenal-rest-defence',
          'Editor notebook: why Arsenal''s rest defence is shaping the weekend',
          'A draft tactical notebook is waiting on one more editing pass before it is ready for publication.',
          ?,
          'DRAFT',
          'https://example.com/news/arsenal-rest-defence',
          '/file.svg',
          NULL,
          JSON_OBJECT('topicLabel', 'Match analysis', 'homepagePlacement', false, 'moderationNotes', 'Add final screenshot references and tighten the intro.'),
          NOW(), NOW()
        ),
        (
          UUID(), ?, 'transfer-watch-london-clubs-reset-their-shortlists',
          'Transfer watch: London clubs reset their shortlists for summer',
          'This archived sample stands in for a takedown-ready article and should remain visible only in editor workflows.',
          ?,
          'ARCHIVED',
          'https://example.com/news/london-clubs-shortlists',
          '/globe.svg',
          DATE_SUB(NOW(), INTERVAL 2 DAY),
          JSON_OBJECT('topicLabel', 'Transfer watch', 'homepagePlacement', false, 'moderationNotes', 'Archived after the brief changed.', 'takedown', JSON_OBJECT('at', DATE_SUB(NOW(), INTERVAL 1 DAY), 'note', 'Outdated briefing.')),
          NOW(), NOW()
        )
      ON DUPLICATE KEY UPDATE
        categoryId = VALUES(categoryId),
        title = VALUES(title),
        excerpt = VALUES(excerpt),
        body = VALUES(body),
        status = VALUES(status),
        sourceUrl = VALUES(sourceUrl),
        imageUrl = VALUES(imageUrl),
        publishedAt = VALUES(publishedAt),
        metadata = VALUES(metadata),
        updatedAt = NOW()
      `,
      [
        titleRaceCategoryId,
        [
          "Arsenal used the live edge of the Emirates atmosphere to speed the match up,",
          "but the bigger story was how calmly they slowed it down once the lead arrived.",
          "",
          "Mikel Arteta's side kept Chelsea pinned with their first wave of pressure,",
          "then protected the centre with a rest-defence line that stopped transitions before they turned into counters.",
          "",
          "That balance is why Arsenal still look like the team best equipped to squeeze every point from the final stretch.",
        ].join(" "),
        matchAnalysisCategoryId,
        [
          "Manchester City and Liverpool reach this fixture carrying different questions but the same urgency.",
          "",
          "City need rhythm back in possession, while Liverpool need to show they can control the middle of a match without turning it into chaos.",
          "",
          "With Arsenal already banking points, the psychological swing of this match could matter almost as much as the table itself.",
        ].join(" "),
        clubWatchCategoryId,
        [
          "Chelsea have enough young quality to break games open,",
          "but they still concede momentum in ugly stretches that should be manageable.",
          "",
          "The next step for the staff is not simply creating chances. It is building a version of the side that stays calm after the first setback.",
          "",
          "That is why the response in the next league fixture matters more than the performance notes alone.",
        ].join(" "),
        titleRaceCategoryId,
        [
          "Results at the top have pulled the leading clubs back into the same frame.",
          "",
          "Every direct clash now carries two stories at once: the immediate points swing and the pressure transferred to the side kicking off later.",
          "",
          "That compression is what makes the Premier League table feel volatile again heading into the run-in.",
        ].join(" "),
        matchAnalysisCategoryId,
        [
          "Arsenal's rest defence has become one of the quiet reasons they keep control late in matches.",
          "",
          "This draft will eventually include annotated examples and a cleaner comparison to the first half of the season.",
        ].join(" "),
        transferWatchCategoryId,
        [
          "The original shortlists moved quickly, then the brief changed and the copy was taken down for review.",
          "",
          "Keeping an archived sample in seed data helps validate takedown and moderation flows in the editor workspace.",
        ].join(" "),
      ]
    );

    const arsenalTitleRaceArticleId = await fetchSingleId(
      connection,
      "NewsArticle",
      "slug = 'arsenal-keep-pressure-on-title-race'",
      []
    );
    const cityLiverpoolPreviewArticleId = await fetchSingleId(
      connection,
      "NewsArticle",
      "slug = 'manchester-city-v-liverpool-preview-run-in-swing-match'",
      []
    );
    const chelseaResponseArticleId = await fetchSingleId(
      connection,
      "NewsArticle",
      "slug = 'chelsea-search-for-response-after-late-collapse'",
      []
    );
    const tableTightensArticleId = await fetchSingleId(
      connection,
      "NewsArticle",
      "slug = 'premier-league-table-tightens-after-march-surge'",
      []
    );
    const arsenalNotebookArticleId = await fetchSingleId(
      connection,
      "NewsArticle",
      "slug = 'editor-notebook-arsenal-rest-defence'",
      []
    );
    const transferWatchArticleId = await fetchSingleId(
      connection,
      "NewsArticle",
      "slug = 'transfer-watch-london-clubs-reset-their-shortlists'",
      []
    );
    const arsenalTitleRaceArticle = await fetchSingleRow(
      connection,
      "NewsArticle",
      "id = ?",
      [arsenalTitleRaceArticleId],
      "id, publishedAt"
    );
    const cityLiverpoolPreviewArticle = await fetchSingleRow(
      connection,
      "NewsArticle",
      "id = ?",
      [cityLiverpoolPreviewArticleId],
      "id, publishedAt"
    );
    const chelseaResponseArticle = await fetchSingleRow(
      connection,
      "NewsArticle",
      "id = ?",
      [chelseaResponseArticleId],
      "id, publishedAt"
    );
    const tableTightensArticle = await fetchSingleRow(
      connection,
      "NewsArticle",
      "id = ?",
      [tableTightensArticleId],
      "id, publishedAt"
    );
    const arsenalNotebookArticle = await fetchSingleRow(
      connection,
      "NewsArticle",
      "id = ?",
      [arsenalNotebookArticleId],
      "id, publishedAt"
    );
    const transferWatchArticle = await fetchSingleRow(
      connection,
      "NewsArticle",
      "id = ?",
      [transferWatchArticleId],
      "id, publishedAt"
    );

    await connection.query(
      `
      DELETE FROM ArticleEntityLink
      WHERE articleId IN (?, ?, ?, ?, ?, ?)
      `,
      [
        arsenalTitleRaceArticleId,
        cityLiverpoolPreviewArticleId,
        chelseaResponseArticleId,
        tableTightensArticleId,
        arsenalNotebookArticleId,
        transferWatchArticleId,
      ]
    );

    await connection.query(
      `
      INSERT INTO ArticleEntityLink (id, articleId, entityType, entityId, label, publishedAt, createdAt)
      VALUES
        (UUID(), ?, 'SPORT', ?, 'Football', ?, NOW()),
        (UUID(), ?, 'COMPETITION', ?, 'Premier League', ?, NOW()),
        (UUID(), ?, 'TEAM', ?, 'Arsenal', ?, NOW()),
        (UUID(), ?, 'TEAM', ?, 'Chelsea', ?, NOW()),
        (UUID(), ?, 'FIXTURE', ?, 'Arsenal vs Chelsea', ?, NOW()),

        (UUID(), ?, 'SPORT', ?, 'Football', ?, NOW()),
        (UUID(), ?, 'COMPETITION', ?, 'Premier League', ?, NOW()),
        (UUID(), ?, 'TEAM', ?, 'Manchester City', ?, NOW()),
        (UUID(), ?, 'TEAM', ?, 'Liverpool', ?, NOW()),
        (UUID(), ?, 'FIXTURE', ?, 'Manchester City vs Liverpool', ?, NOW()),

        (UUID(), ?, 'SPORT', ?, 'Football', ?, NOW()),
        (UUID(), ?, 'COMPETITION', ?, 'Premier League', ?, NOW()),
        (UUID(), ?, 'TEAM', ?, 'Chelsea', ?, NOW()),
        (UUID(), ?, 'TEAM', ?, 'Arsenal', ?, NOW()),
        (UUID(), ?, 'FIXTURE', ?, 'Chelsea vs Arsenal', ?, NOW()),

        (UUID(), ?, 'SPORT', ?, 'Football', ?, NOW()),
        (UUID(), ?, 'COMPETITION', ?, 'Premier League', ?, NOW()),

        (UUID(), ?, 'SPORT', ?, 'Football', ?, NOW()),
        (UUID(), ?, 'TEAM', ?, 'Arsenal', ?, NOW()),

        (UUID(), ?, 'SPORT', ?, 'Football', ?, NOW()),
        (UUID(), ?, 'TEAM', ?, 'Chelsea', ?, NOW())
      `,
      [
        arsenalTitleRaceArticleId, sportId, arsenalTitleRaceArticle?.publishedAt || null,
        arsenalTitleRaceArticleId, competitionId, arsenalTitleRaceArticle?.publishedAt || null,
        arsenalTitleRaceArticleId, arsenalId, arsenalTitleRaceArticle?.publishedAt || null,
        arsenalTitleRaceArticleId, chelseaId, arsenalTitleRaceArticle?.publishedAt || null,
        arsenalTitleRaceArticleId, liveFixtureId, arsenalTitleRaceArticle?.publishedAt || null,

        cityLiverpoolPreviewArticleId, sportId, cityLiverpoolPreviewArticle?.publishedAt || null,
        cityLiverpoolPreviewArticleId, competitionId, cityLiverpoolPreviewArticle?.publishedAt || null,
        cityLiverpoolPreviewArticleId, manCityId, cityLiverpoolPreviewArticle?.publishedAt || null,
        cityLiverpoolPreviewArticleId, liverpoolId, cityLiverpoolPreviewArticle?.publishedAt || null,
        cityLiverpoolPreviewArticleId, upcomingFixtureId, cityLiverpoolPreviewArticle?.publishedAt || null,

        chelseaResponseArticleId, sportId, chelseaResponseArticle?.publishedAt || null,
        chelseaResponseArticleId, competitionId, chelseaResponseArticle?.publishedAt || null,
        chelseaResponseArticleId, chelseaId, chelseaResponseArticle?.publishedAt || null,
        chelseaResponseArticleId, arsenalId, chelseaResponseArticle?.publishedAt || null,
        chelseaResponseArticleId, finishedFixtureId, chelseaResponseArticle?.publishedAt || null,

        tableTightensArticleId, sportId, tableTightensArticle?.publishedAt || null,
        tableTightensArticleId, competitionId, tableTightensArticle?.publishedAt || null,

        arsenalNotebookArticleId, sportId, arsenalNotebookArticle?.publishedAt || null,
        arsenalNotebookArticleId, arsenalId, arsenalNotebookArticle?.publishedAt || null,

        transferWatchArticleId, sportId, transferWatchArticle?.publishedAt || null,
        transferWatchArticleId, chelseaId, transferWatchArticle?.publishedAt || null,
      ]
    );

    await connection.query(
      `
      DELETE FROM OpsIssue
      WHERE title IN (
        'Live score dispute for Arsenal vs Chelsea',
        'Archived transfer-watch brief needs follow-up'
      )
      `
    );

    await connection.query(
      `
      INSERT INTO OpsIssue (
        id, issueType, status, priority, title, description, entityType, entityId, fixtureId, articleId, metadata, createdAt, updatedAt, resolvedAt
      )
      VALUES
        (
          UUID(), 'WRONG_SCORE', 'OPEN', 'HIGH',
          'Live score dispute for Arsenal vs Chelsea',
          'Operations flagged a disagreement between the provider feed and an editorial monitor on the live Arsenal v Chelsea scoreline.',
          'Fixture', ?, ?, NULL,
          JSON_OBJECT('queue', 'scores', 'reportedSource', 'ops-seed'),
          NOW(), NOW(), NULL
        ),
        (
          UUID(), 'BROKEN_ARTICLE_CONTENT', 'INVESTIGATING', 'MEDIUM',
          'Archived transfer-watch brief needs follow-up',
          'The archived transfer-watch article remains in the editorial history and should stay linked to takedown notes until review closes.',
          'NewsArticle', ?, NULL, ?,
          JSON_OBJECT('queue', 'content', 'reportedSource', 'ops-seed'),
          NOW(), NOW(), NULL
        )
      `,
      [
        liveFixtureId,
        liveFixtureId,
        transferWatchArticleId,
        transferWatchArticleId,
      ]
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
}

seed()
  .then(() => {
    console.log("Seed completed.");
  })
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });
