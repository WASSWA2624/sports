import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT_DIR = process.cwd();

function readTextFile(pathname) {
  try {
    return readFileSync(pathname, "utf8").trim();
  } catch (error) {
    return null;
  }
}

function readJsonFile(pathname) {
  try {
    return JSON.parse(readFileSync(pathname, "utf8"));
  } catch (error) {
    return null;
  }
}

function readBuildId(rootDir = ROOT_DIR) {
  const buildIdPath = resolve(rootDir, ".next", "BUILD_ID");
  return existsSync(buildIdPath) ? readTextFile(buildIdPath) : null;
}

function readPackageVersion(rootDir = ROOT_DIR) {
  const packageJson = readJsonFile(resolve(rootDir, "package.json"));
  return packageJson?.version || null;
}

function compactDateString(value = new Date().toISOString()) {
  return String(value).slice(0, 10).replace(/-/g, "");
}

export function getReleaseInfo(rootDir = ROOT_DIR) {
  const packageVersion = readPackageVersion(rootDir);
  const buildId = readBuildId(rootDir);
  const commitSha =
    process.env.RELEASE_COMMIT_SHA ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    null;
  const createdAt = process.env.RELEASE_CREATED_AT || new Date().toISOString();
  const fallbackVersion = [packageVersion || "0.0.0", compactDateString(createdAt), (buildId || "dev").slice(0, 12)]
    .filter(Boolean)
    .join("-");

  return {
    version: process.env.RELEASE_VERSION || fallbackVersion,
    channel: process.env.RELEASE_CHANNEL || process.env.VERCEL_ENV || process.env.NODE_ENV || "development",
    commitSha,
    buildId,
    appVersion: packageVersion,
    createdAt,
    notesUrl: process.env.RELEASE_NOTES_URL || null,
    supportOwner: process.env.RELEASE_SUPPORT_OWNER || null,
    supportChannel: process.env.RELEASE_SUPPORT_CHANNEL || null,
  };
}
