import { createWriteStream } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
import {
  compactDateString,
  ensureDirectory,
  isPlaceholderValue,
  loadEnvFiles,
  readEnvString,
} from "./lib/env-utils.mjs";
import { ROOT_DIR, buildReleaseDescriptor } from "./lib/release-utils.mjs";

const BACKUP_ROOT = resolve(ROOT_DIR, "build", "db-backups");

function parseDatabaseUrl(databaseUrl) {
  const parsed = new URL(databaseUrl);
  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 3306,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace(/^\//, ""),
  };
}

function pickDumpExecutable() {
  return process.env.DB_DUMP_BINARY || "mysqldump";
}

function buildDumpArguments(connection) {
  return [
    `--host=${connection.host}`,
    `--port=${connection.port}`,
    `--user=${connection.user}`,
    "--single-transaction",
    "--quick",
    "--routines",
    "--triggers",
    connection.database,
  ];
}

function getBackupFilePath(release) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return resolve(
    BACKUP_ROOT,
    `${compactDateString(release.createdAt)}-${release.version}-${timestamp}.sql`
  );
}

export async function runDatabaseBackup(options = {}) {
  await loadEnvFiles(ROOT_DIR);

  const databaseUrl = readEnvString("DATABASE_URL");
  if (!databaseUrl || isPlaceholderValue(databaseUrl)) {
    throw new Error("DATABASE_URL must be configured with a real MySQL connection before backup.");
  }

  const release = await buildReleaseDescriptor(ROOT_DIR);
  const connection = parseDatabaseUrl(databaseUrl);
  const backupFile = getBackupFilePath(release);
  const executable = pickDumpExecutable();
  const args = buildDumpArguments(connection);
  const dryRun = options.dryRun || process.argv.includes("--dry-run") || process.env.DB_BACKUP_DRY_RUN === "true";

  await ensureDirectory(BACKUP_ROOT);

  if (dryRun) {
    return {
      dryRun: true,
      executable,
      args,
      backupFile,
      restoreHint: `mysql --host=${connection.host} --port=${connection.port} --user=${connection.user} ${connection.database} < ${backupFile}`,
    };
  }

  await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(executable, args, {
      cwd: ROOT_DIR,
      env: {
        ...process.env,
        MYSQL_PWD: connection.password,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    const output = createWriteStream(backupFile);
    let stderr = "";

    child.stdout.pipe(output);
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk || "");
    });
    child.on("error", (error) => {
      rejectPromise(error);
    });
    child.on("close", (code) => {
      if (code === 0) {
        resolvePromise();
        return;
      }

      rejectPromise(new Error(stderr.trim() || `${executable} exited with code ${code}.`));
    });
  });

  return {
    dryRun: false,
    executable,
    backupFile,
    restoreHint: `mysql --host=${connection.host} --port=${connection.port} --user=${connection.user} ${connection.database} < ${backupFile}`,
  };
}

const isMainModule = fileURLToPath(import.meta.url) === resolve(process.argv[1] || "");

if (isMainModule) {
  try {
    const summary = await runDatabaseBackup();
    console.log(JSON.stringify(summary, null, 2));
  } catch (error) {
    console.error(
      JSON.stringify(
        {
          error: error instanceof Error ? error.message : String(error),
        },
        null,
        2
      )
    );
    process.exitCode = 1;
  }
}
