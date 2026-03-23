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
        (UUID(), 'news_hub_enabled', 'Enable news mode and editorial modules', false, NOW(), NOW()),
        (UUID(), 'odds_surfaces_enabled', 'Enable informational odds surfaces', true, NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        description = VALUES(description),
        enabled = VALUES(enabled),
        updatedAt = NOW()
      `
    );

    await connection.query(
      `
      INSERT INTO SourceProvider (id, code, name, kind, isActive, createdAt, updatedAt)
      VALUES
        (UUID(), 'SPORTSMONKS', 'SportsMonks', 'football-feed', true, NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        kind = VALUES(kind),
        isActive = VALUES(isActive),
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
