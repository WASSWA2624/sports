import { existsSync } from "node:fs";
import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(SCRIPT_DIR, "..");
const NEXT_DIR = resolve(ROOT_DIR, ".next");
const STANDALONE_DIR = resolve(NEXT_DIR, "standalone");
const STATIC_DIR = resolve(NEXT_DIR, "static");
const PUBLIC_DIR = resolve(ROOT_DIR, "public");
const OUTPUT_DIR = resolve(ROOT_DIR, "build", "cpanel");
const PRODUCTION_ENV_EXAMPLE = resolve(ROOT_DIR, ".env.production.example");

function requirePath(pathname, label) {
  if (!existsSync(pathname)) {
    throw new Error(`${label} was not found at ${pathname}. Run npm run build:production first.`);
  }
}

async function readPackageVersion() {
  const packageJson = JSON.parse(await readFile(resolve(ROOT_DIR, "package.json"), "utf8"));
  return packageJson.version || "0.0.0";
}

function buildReleaseStamp() {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, "-");
}

function buildAppEntrypoint() {
  return [
    "process.env.NODE_ENV = process.env.NODE_ENV || 'production';",
    "process.env.HOSTNAME = process.env.HOSTNAME || '0.0.0.0';",
    "require('./server.js');",
    "",
  ].join("\n");
}

function buildDeploymentNotes({ version, releaseStamp }) {
  return [
    "cPanel deployment bundle",
    `Version: ${version}`,
    `Packaged at: ${releaseStamp}`,
    "",
    "Application root: this directory",
    "Startup file: app.js",
    "",
    "Required environment variables before starting the app:",
    "- NODE_ENV=production",
    "- NEXT_PUBLIC_SITE_URL=https://your-domain.example",
    "- SITE_URL=https://your-domain.example",
    "",
    "Recommended restart path for Passenger/Application Manager:",
    "- touch tmp/restart.txt",
    "",
    "Smoke test after deploy:",
    "- /",
    "- /en",
    "- /api/health",
    "",
  ].join("\n");
}

async function main() {
  requirePath(STANDALONE_DIR, "Next standalone output");
  requirePath(STATIC_DIR, "Next static assets");

  const version = await readPackageVersion();
  const releaseStamp = buildReleaseStamp();

  await rm(OUTPUT_DIR, { force: true, recursive: true });
  await mkdir(OUTPUT_DIR, { recursive: true });
  await cp(STANDALONE_DIR, OUTPUT_DIR, { recursive: true });
  await mkdir(resolve(OUTPUT_DIR, ".next"), { recursive: true });
  await cp(STATIC_DIR, resolve(OUTPUT_DIR, ".next", "static"), { recursive: true });

  if (existsSync(PUBLIC_DIR)) {
    await cp(PUBLIC_DIR, resolve(OUTPUT_DIR, "public"), { recursive: true });
  }

  const outputEntries = await readdir(OUTPUT_DIR, { withFileTypes: true });

  for (const entry of outputEntries) {
    if (entry.name.startsWith(".env")) {
      await rm(resolve(OUTPUT_DIR, entry.name), { force: true, recursive: true });
    }
  }

  if (existsSync(PRODUCTION_ENV_EXAMPLE)) {
    await cp(PRODUCTION_ENV_EXAMPLE, resolve(OUTPUT_DIR, ".env.production.example"));
  }

  await mkdir(resolve(OUTPUT_DIR, "tmp"), { recursive: true });
  await mkdir(resolve(OUTPUT_DIR, "logs"), { recursive: true });
  await writeFile(resolve(OUTPUT_DIR, "app.js"), buildAppEntrypoint(), "utf8");
  await writeFile(
    resolve(OUTPUT_DIR, "DEPLOYMENT.txt"),
    buildDeploymentNotes({ version, releaseStamp }),
    "utf8"
  );

  console.log("cPanel bundle created.");
  console.log(`- Output: ${OUTPUT_DIR}`);
  console.log(`- Version: ${version}`);
  console.log(`- Startup file: ${resolve(OUTPUT_DIR, "app.js")}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
