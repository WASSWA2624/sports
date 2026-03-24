import { cp, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { compactDateString, safeSlug } from "./env-utils.mjs";

export const ROOT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

async function readJsonFile(pathname) {
  const contents = await readFile(pathname, "utf8");
  return JSON.parse(contents);
}

async function readTextFile(pathname) {
  return (await readFile(pathname, "utf8")).trim();
}

function readGitCommit(rootDir = ROOT_DIR) {
  const result = spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: rootDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });

  return result.status === 0 ? String(result.stdout || "").trim() || null : null;
}

export async function getPackageMetadata(rootDir = ROOT_DIR) {
  const packageJson = await readJsonFile(resolve(rootDir, "package.json"));
  return {
    name: packageJson.name || "sports",
    version: packageJson.version || "0.0.0",
  };
}

export async function readBuildId(rootDir = ROOT_DIR) {
  try {
    return await readTextFile(resolve(rootDir, ".next", "BUILD_ID"));
  } catch (error) {
    return null;
  }
}

export async function buildReleaseDescriptor(rootDir = ROOT_DIR, env = process.env) {
  const packageMetadata = await getPackageMetadata(rootDir);
  const buildId = await readBuildId(rootDir);
  const commitSha = env.RELEASE_COMMIT_SHA || env.VERCEL_GIT_COMMIT_SHA || readGitCommit(rootDir);
  const createdAt = env.RELEASE_CREATED_AT || new Date().toISOString();
  const fallbackDisplayVersion = [
    packageMetadata.version,
    compactDateString(createdAt),
    (buildId || commitSha || "dev").slice(0, 12),
  ].join("-");
  const displayVersion = env.RELEASE_VERSION || fallbackDisplayVersion;

  return {
    service: packageMetadata.name,
    appVersion: packageMetadata.version,
    version: safeSlug(displayVersion),
    displayVersion,
    buildId,
    channel: env.RELEASE_CHANNEL || env.VERCEL_ENV || env.NODE_ENV || "development",
    commitSha,
    createdAt,
    notesUrl: env.RELEASE_NOTES_URL || null,
    supportOwner: env.RELEASE_SUPPORT_OWNER || null,
    supportChannel: env.RELEASE_SUPPORT_CHANNEL || null,
  };
}

export async function writeJsonFile(pathname, payload) {
  await writeFile(pathname, JSON.stringify(payload, null, 2) + "\n", "utf8");
  return pathname;
}

export async function copyPath(sourcePath, destinationPath, options = {}) {
  await cp(sourcePath, destinationPath, {
    recursive: true,
    force: false,
    errorOnExist: false,
    ...options,
  });
}
