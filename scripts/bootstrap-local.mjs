import { copyFileSync, existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import mysql from "mysql2/promise";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(__dirname, "..");
const ENV_PATH = resolve(ROOT_DIR, ".env");
const ENV_EXAMPLE_PATH = resolve(ROOT_DIR, ".env.example");
const DB_WAIT_ATTEMPTS = 25;
const DB_WAIT_DELAY_MS = 2000;

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return {};
  }

  return readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .reduce((env, line) => {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("#")) {
        return env;
      }

      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex < 0) {
        return env;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      let value = trimmed.slice(separatorIndex + 1).trim();

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      env[key] = value;
      return env;
    }, {});
}

function sleep(ms) {
  return new Promise((resolveSleep) => {
    setTimeout(resolveSleep, ms);
  });
}

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

function createCommandRunner(env) {
  return (command, args) =>
    new Promise((resolveCommand, rejectCommand) => {
      const child = spawn(command, args, {
        cwd: ROOT_DIR,
        env,
        stdio: "inherit",
        shell: process.platform === "win32",
      });

      child.on("exit", (code) => {
        if (code === 0) {
          resolveCommand();
          return;
        }

        rejectCommand(new Error(`${command} ${args.join(" ")} exited with code ${code}.`));
      });

      child.on("error", rejectCommand);
    });
}

async function waitForDatabase(databaseUrl) {
  if (!databaseUrl) {
    return false;
  }

  const connectionConfig = parseDatabaseUrl(databaseUrl);

  for (let attempt = 1; attempt <= DB_WAIT_ATTEMPTS; attempt += 1) {
    try {
      const connection = await mysql.createConnection(connectionConfig);
      await connection.query("SELECT 1");
      await connection.end();
      return true;
    } catch (error) {
      if (attempt === DB_WAIT_ATTEMPTS) {
        return false;
      }

      await sleep(DB_WAIT_DELAY_MS);
    }
  }

  return false;
}

function ensureLocalEnvFile() {
  if (!existsSync(ENV_PATH) && existsSync(ENV_EXAMPLE_PATH) && !process.env.DATABASE_URL) {
    copyFileSync(ENV_EXAMPLE_PATH, ENV_PATH);
    console.log("[bootstrap] Created .env from .env.example.");
  }
}

async function main() {
  ensureLocalEnvFile();

  const fileEnv = parseEnvFile(ENV_PATH);
  const env = {
    ...fileEnv,
    ...process.env,
  };
  const run = createCommandRunner(env);
  const databaseUrl = env.DATABASE_URL || "";
  const devArgs = process.argv.slice(2);

  if (databaseUrl) {
    console.log("[bootstrap] Waiting for MySQL...");
  }

  const databaseReady = await waitForDatabase(databaseUrl);

  if (databaseReady) {
    console.log("[bootstrap] Database available. Running Prisma generate, migrate, and seed.");
    await run("npm", ["run", "db:generate"]);
    await run("npm", ["run", "db:migrate:deploy"]);
    await run("npm", ["run", "db:seed"]);
  } else {
    console.log(
      "[bootstrap] Database not reachable. Starting the app in degraded mode so shell/layout work can continue."
    );
  }

  console.log("[bootstrap] Starting Next.js dev server.");
  await run("npm", ["run", "dev", "--", ...devArgs]);
}

main().catch((error) => {
  console.error("[bootstrap] Failed:", error);
  process.exit(1);
});
