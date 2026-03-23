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

    const [leagueRows] = await connection.query(
      `
      SELECT id
      FROM League
      WHERE code = 'EPL'
      LIMIT 1
      `
    );

    let leagueId;
    if (leagueRows.length === 0) {
      await connection.query(
        `
        INSERT INTO League (id, name, country, code, isActive, createdAt, updatedAt)
        VALUES (UUID(), 'Premier League', 'England', 'EPL', true, NOW(), NOW())
        `
      );
      const [createdLeague] = await connection.query(
        `
        SELECT id
        FROM League
        WHERE code = 'EPL'
        LIMIT 1
        `
      );
      leagueId = createdLeague[0].id;
    } else {
      leagueId = leagueRows[0].id;
    }

    await connection.query(
      `
      INSERT INTO Team (id, leagueId, name, shortName, code, createdAt, updatedAt)
      VALUES
        (UUID(), ?, 'Arsenal', 'ARS', 'ARS', NOW(), NOW()),
        (UUID(), ?, 'Manchester City', 'MCI', 'MCI', NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        shortName = VALUES(shortName),
        code = VALUES(code),
        updatedAt = NOW()
      `,
      [leagueId, leagueId]
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
