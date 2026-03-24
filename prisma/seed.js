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
      INSERT INTO SourceProvider (id, code, name, kind, isActive, metadata, createdAt, updatedAt)
      VALUES
        (
          UUID(), 'SPORTSMONKS', 'SportsMonks Football', 'football-feed', true,
          JSON_OBJECT('role', 'primary', 'tier', 'live', 'stage', 'live', 'sports', JSON_ARRAY('football')),
          NOW(), NOW()
        ),
        (
          UUID(), 'SPORTSMONKS_BASKETBALL', 'SportsMonks Basketball', 'basketball-feed', false,
          JSON_OBJECT('role', 'expansion', 'tier', 'planned', 'stage', 'planned', 'sports', JSON_ARRAY('basketball')),
          NOW(), NOW()
        ),
        (
          UUID(), 'SPORTSMONKS_TENNIS', 'SportsMonks Tennis', 'tennis-feed', false,
          JSON_OBJECT('role', 'expansion', 'tier', 'planned', 'stage', 'planned', 'sports', JSON_ARRAY('tennis')),
          NOW(), NOW()
        ),
        (
          UUID(), 'SCOREBOARD_BACKUP', 'Scoreboard Backup Feed', 'backup-feed', false,
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
        isActive = VALUES(isActive),
        metadata = VALUES(metadata),
        updatedAt = NOW()
      `
    );

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
      INSERT INTO Fixture (
        id, sportId, countryId, competitionId, leagueId, seasonId, homeTeamId, awayTeamId, provider,
        startsAt, status, venue, externalRef, round, stateReason, lastSyncedAt, createdAt, updatedAt
      )
      VALUES
        (UUID(), ?, ?, ?, ?, ?, ?, ?, 'SPORTSMONKS', ?, 'LIVE', 'Emirates Stadium', 'seed-live-ars-che', 'Round 30', 'In Play', NOW(), NOW(), NOW()),
        (UUID(), ?, ?, ?, ?, ?, ?, ?, 'SPORTSMONKS', ?, 'SCHEDULED', 'Etihad Stadium', 'seed-upcoming-mci-liv', 'Round 30', null, NOW(), NOW(), NOW()),
        (UUID(), ?, ?, ?, ?, ?, ?, ?, 'SPORTSMONKS', ?, 'FINISHED', 'Stamford Bridge', 'seed-finished-che-ars', 'Round 29', 'Full Time', NOW(), NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        startsAt = VALUES(startsAt),
        status = VALUES(status),
        venue = VALUES(venue),
        round = VALUES(round),
        stateReason = VALUES(stateReason),
        updatedAt = NOW()
      `,
      [
        sportId, countryId, competitionId, leagueId, seasonId, arsenalId, chelseaId, isoOffset(0, -1),
        sportId, countryId, competitionId, leagueId, seasonId, manCityId, liverpoolId, isoOffset(1, 3),
        sportId, countryId, competitionId, leagueId, seasonId, chelseaId, arsenalId, isoOffset(-1, 1),
      ]
    );

    const liveFixtureId = await fetchSingleId(connection, "Fixture", "externalRef = 'seed-live-ars-che'", []);
    const upcomingFixtureId = await fetchSingleId(connection, "Fixture", "externalRef = 'seed-upcoming-mci-liv'", []);
    const finishedFixtureId = await fetchSingleId(connection, "Fixture", "externalRef = 'seed-finished-che-ars'", []);

    await connection.query(
      `
      INSERT INTO ResultSnapshot (id, fixtureId, homeScore, awayScore, statusText, capturedAt)
      VALUES
        (UUID(), ?, 2, 1, 'In Play', NOW()),
        (UUID(), ?, 0, 0, 'Scheduled', NOW()),
        (UUID(), ?, 1, 3, 'Full Time', NOW())
      ON DUPLICATE KEY UPDATE
        homeScore = VALUES(homeScore),
        awayScore = VALUES(awayScore),
        statusText = VALUES(statusText),
        capturedAt = NOW()
      `,
      [liveFixtureId, upcomingFixtureId, finishedFixtureId]
    );

    await connection.query(
      `
      INSERT INTO OddsMarket (
        id, fixtureId, provider, externalRef, bookmaker, marketType, suspended, lastSyncedAt, metadata, createdAt, updatedAt
      )
      VALUES
        (
          UUID(), ?, 'SPORTSMONKS', 'seed-live-1x2', 'PulseBook', '1X2', false,
          DATE_SUB(NOW(), INTERVAL 40 MINUTE),
          JSON_OBJECT('allowedTerritories', JSON_ARRAY('US', 'UG')),
          NOW(), NOW()
        ),
        (
          UUID(), ?, 'SPORTSMONKS', 'seed-live-goals', 'PulseBook', 'Over/Under 2.5', false,
          DATE_SUB(NOW(), INTERVAL 40 MINUTE),
          JSON_OBJECT('allowedTerritories', JSON_ARRAY('US', 'UG')),
          NOW(), NOW()
        ),
        (
          UUID(), ?, 'SPORTSMONKS', 'seed-upcoming-1x2', 'NorthLine', '1X2', false,
          NOW(),
          JSON_OBJECT('allowedTerritories', JSON_ARRAY('GB')),
          NOW(), NOW()
        )
      ON DUPLICATE KEY UPDATE
        bookmaker = VALUES(bookmaker),
        marketType = VALUES(marketType),
        suspended = VALUES(suspended),
        lastSyncedAt = VALUES(lastSyncedAt),
        metadata = VALUES(metadata),
        updatedAt = NOW()
      `,
      [liveFixtureId, liveFixtureId, upcomingFixtureId]
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
      DELETE FROM BroadcastChannel
      WHERE fixtureId IN (?, ?)
      `,
      [liveFixtureId, upcomingFixtureId]
    );

    await connection.query(
      `
      INSERT INTO BroadcastChannel (
        id, fixtureId, name, territory, channelType, url, isActive, metadata, createdAt, updatedAt
      )
      VALUES
        (
          UUID(), ?, 'NBC Sports', 'US', 'tv', 'https://www.nbcsports.com', true,
          JSON_OBJECT('countries', JSON_ARRAY(JSON_OBJECT('code', 'US'))),
          NOW(), NOW()
        ),
        (
          UUID(), ?, 'Peacock', 'US', 'streaming', 'https://www.peacocktv.com', true,
          JSON_OBJECT('countries', JSON_ARRAY(JSON_OBJECT('code', 'US'))),
          NOW(), NOW()
        ),
        (
          UUID(), ?, 'Sky Sports Main Event', 'GB', 'tv', 'https://www.skysports.com', true,
          JSON_OBJECT('countries', JSON_ARRAY(JSON_OBJECT('code', 'GB'))),
          NOW(), NOW()
        )
      `,
      [liveFixtureId, liveFixtureId, upcomingFixtureId]
    );

    await connection.query(
      `
      INSERT INTO Standing (id, seasonId, competitionId, teamId, position, played, won, drawn, lost, goalsFor, goalsAgainst, points)
      VALUES
        (UUID(), ?, ?, ?, 1, 29, 21, 5, 3, 64, 27, 68),
        (UUID(), ?, ?, ?, 2, 29, 20, 4, 5, 62, 29, 64),
        (UUID(), ?, ?, ?, 3, 29, 16, 7, 6, 54, 33, 55),
        (UUID(), ?, ?, ?, 4, 29, 15, 8, 6, 52, 31, 53)
      ON DUPLICATE KEY UPDATE
        position = VALUES(position),
        played = VALUES(played),
        won = VALUES(won),
        drawn = VALUES(drawn),
        lost = VALUES(lost),
        goalsFor = VALUES(goalsFor),
        goalsAgainst = VALUES(goalsAgainst),
        points = VALUES(points)
      `,
      [
        seasonId, competitionId, arsenalId,
        seasonId, competitionId, manCityId,
        seasonId, competitionId, liverpoolId,
        seasonId, competitionId, chelseaId,
      ]
    );

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
      INSERT INTO ArticleEntityLink (id, articleId, entityType, entityId, label, createdAt)
      VALUES
        (UUID(), ?, 'SPORT', ?, 'Football', NOW()),
        (UUID(), ?, 'COMPETITION', ?, 'Premier League', NOW()),
        (UUID(), ?, 'TEAM', ?, 'Arsenal', NOW()),
        (UUID(), ?, 'TEAM', ?, 'Chelsea', NOW()),
        (UUID(), ?, 'FIXTURE', ?, 'Arsenal vs Chelsea', NOW()),

        (UUID(), ?, 'SPORT', ?, 'Football', NOW()),
        (UUID(), ?, 'COMPETITION', ?, 'Premier League', NOW()),
        (UUID(), ?, 'TEAM', ?, 'Manchester City', NOW()),
        (UUID(), ?, 'TEAM', ?, 'Liverpool', NOW()),
        (UUID(), ?, 'FIXTURE', ?, 'Manchester City vs Liverpool', NOW()),

        (UUID(), ?, 'SPORT', ?, 'Football', NOW()),
        (UUID(), ?, 'COMPETITION', ?, 'Premier League', NOW()),
        (UUID(), ?, 'TEAM', ?, 'Chelsea', NOW()),
        (UUID(), ?, 'TEAM', ?, 'Arsenal', NOW()),
        (UUID(), ?, 'FIXTURE', ?, 'Chelsea vs Arsenal', NOW()),

        (UUID(), ?, 'SPORT', ?, 'Football', NOW()),
        (UUID(), ?, 'COMPETITION', ?, 'Premier League', NOW()),

        (UUID(), ?, 'SPORT', ?, 'Football', NOW()),
        (UUID(), ?, 'TEAM', ?, 'Arsenal', NOW()),

        (UUID(), ?, 'SPORT', ?, 'Football', NOW()),
        (UUID(), ?, 'TEAM', ?, 'Chelsea', NOW())
      `,
      [
        arsenalTitleRaceArticleId, sportId,
        arsenalTitleRaceArticleId, competitionId,
        arsenalTitleRaceArticleId, arsenalId,
        arsenalTitleRaceArticleId, chelseaId,
        arsenalTitleRaceArticleId, liveFixtureId,

        cityLiverpoolPreviewArticleId, sportId,
        cityLiverpoolPreviewArticleId, competitionId,
        cityLiverpoolPreviewArticleId, manCityId,
        cityLiverpoolPreviewArticleId, liverpoolId,
        cityLiverpoolPreviewArticleId, upcomingFixtureId,

        chelseaResponseArticleId, sportId,
        chelseaResponseArticleId, competitionId,
        chelseaResponseArticleId, chelseaId,
        chelseaResponseArticleId, arsenalId,
        chelseaResponseArticleId, finishedFixtureId,

        tableTightensArticleId, sportId,
        tableTightensArticleId, competitionId,

        arsenalNotebookArticleId, sportId,
        arsenalNotebookArticleId, arsenalId,

        transferWatchArticleId, sportId,
        transferWatchArticleId, chelseaId,
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
