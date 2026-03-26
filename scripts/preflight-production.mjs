import nextEnv from "@next/env";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const MIN_NODE_VERSION = "20.9.0";
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(SCRIPT_DIR, "..");
const { loadEnvConfig } = nextEnv;

loadEnvConfig(ROOT_DIR);

function parseSemver(value) {
  return String(value || "")
    .replace(/^v/i, "")
    .split(".")
    .map((entry) => Number.parseInt(entry, 10) || 0)
    .slice(0, 3);
}

function compareSemver(left, right) {
  const leftParts = parseSemver(left);
  const rightParts = parseSemver(right);

  for (let index = 0; index < 3; index += 1) {
    if (leftParts[index] > rightParts[index]) {
      return 1;
    }

    if (leftParts[index] < rightParts[index]) {
      return -1;
    }
  }

  return 0;
}

function readFirstEnv(...names) {
  for (const name of names) {
    const value = process.env[name];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function normalizeUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function validateAbsoluteUrl(value, label, errors) {
  if (!value) {
    return;
  }

  try {
    const parsed = new URL(value);

    if (!["http:", "https:"].includes(parsed.protocol)) {
      errors.push(`${label} must use http or https.`);
    }
  } catch (error) {
    errors.push(`${label} must be a valid absolute URL.`);
  }
}

const errors = [];
const warnings = [];

if (compareSemver(process.versions.node, MIN_NODE_VERSION) < 0) {
  errors.push(
    `Node.js ${MIN_NODE_VERSION}+ is required for this project. Current version: ${process.versions.node}.`
  );
}

const siteUrl = readFirstEnv("NEXT_PUBLIC_SITE_URL", "SITE_URL");
const publicSiteUrl = readFirstEnv("NEXT_PUBLIC_SITE_URL");
const internalSiteUrl = readFirstEnv("SITE_URL");

if (!siteUrl) {
  errors.push(
    "Set NEXT_PUBLIC_SITE_URL or SITE_URL before running a production build so sitemap, robots, and metadata use your real domain."
  );
}

validateAbsoluteUrl(siteUrl, "NEXT_PUBLIC_SITE_URL/SITE_URL", errors);
validateAbsoluteUrl(publicSiteUrl, "NEXT_PUBLIC_SITE_URL", errors);
validateAbsoluteUrl(internalSiteUrl, "SITE_URL", errors);

if (publicSiteUrl && internalSiteUrl && normalizeUrl(publicSiteUrl) !== normalizeUrl(internalSiteUrl)) {
  warnings.push("NEXT_PUBLIC_SITE_URL and SITE_URL do not match. Production metadata will use NEXT_PUBLIC_SITE_URL.");
}

if (!publicSiteUrl || !internalSiteUrl) {
  warnings.push(
    "Set both NEXT_PUBLIC_SITE_URL and SITE_URL to the same production URL to keep server and client metadata aligned."
  );
}

if (!readFirstEnv("RELEASE_CHANNEL")) {
  warnings.push("RELEASE_CHANNEL is not set. The app will fall back to NODE_ENV for release labeling.");
}

if (errors.length) {
  console.error("Production preflight failed:\n");

  for (const error of errors) {
    console.error(`- ${error}`);
  }

  if (warnings.length) {
    console.error("\nWarnings:");

    for (const warning of warnings) {
      console.error(`- ${warning}`);
    }
  }

  process.exit(1);
}

console.log("Production preflight passed.");
console.log(`- Node.js: ${process.versions.node}`);
console.log(`- Site URL: ${siteUrl}`);

if (warnings.length) {
  console.log("Warnings:");

  for (const warning of warnings) {
    console.log(`- ${warning}`);
  }
}
