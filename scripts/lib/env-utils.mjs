import { access, mkdir, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { resolve } from "node:path";

function stripQuotes(value) {
  if (!value) {
    return value;
  }

  const trimmed = value.trim();
  const first = trimmed[0];
  const last = trimmed[trimmed.length - 1];

  if ((first === "'" || first === '"') && first === last) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

export function parseDotEnv(contents) {
  const result = {};

  for (const line of String(contents || "").split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const normalized = trimmed.startsWith("export ") ? trimmed.slice(7).trim() : trimmed;
    const separatorIndex = normalized.indexOf("=");

    if (separatorIndex <= 0) {
      continue;
    }

    const key = normalized.slice(0, separatorIndex).trim();
    const value = normalized.slice(separatorIndex + 1);

    if (!key) {
      continue;
    }

    result[key] = stripQuotes(value);
  }

  return result;
}

export async function pathExists(pathname) {
  try {
    await access(pathname, constants.F_OK);
    return true;
  } catch (error) {
    return false;
  }
}

export async function ensureDirectory(pathname) {
  await mkdir(pathname, { recursive: true });
  return pathname;
}

export async function loadEnvFiles(rootDir, files = [".env", ".env.local"]) {
  const loadedFiles = [];

  for (const file of files) {
    const pathname = resolve(rootDir, file);

    if (!(await pathExists(pathname))) {
      continue;
    }

    const contents = await readFile(pathname, "utf8");
    const parsed = parseDotEnv(contents);

    for (const [key, value] of Object.entries(parsed)) {
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }

    loadedFiles.push(pathname);
  }

  return loadedFiles;
}

export function readEnvString(name, fallback = null) {
  const value = process.env[name];
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : fallback;
}

export function readEnvInteger(name, fallback = null) {
  const value = readEnvString(name);
  if (value == null) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function readEnvNumber(name, fallback = null) {
  const value = readEnvString(name);
  if (value == null) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function readEnvBoolean(name, fallback = null) {
  const value = readEnvString(name);
  if (value == null) {
    return fallback;
  }

  if (["1", "true", "yes", "on"].includes(value.toLowerCase())) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(value.toLowerCase())) {
    return false;
  }

  return fallback;
}

export function isPlaceholderValue(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  return [
    "replace_me",
    "changeme",
    "change_me",
    "placeholder",
    "example",
    "example.com",
    "test",
    "todo",
  ].includes(normalized);
}

export function maskSecret(value) {
  const text = String(value || "");
  if (!text) {
    return null;
  }

  if (text.length <= 8) {
    return `${text.slice(0, 2)}***`;
  }

  return `${text.slice(0, 3)}***${text.slice(-3)}`;
}

export function safeSlug(value, fallback = "release") {
  const normalized = String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  return normalized || fallback;
}

export function compactDateString(value = new Date().toISOString()) {
  return String(value).slice(0, 10).replace(/-/g, "");
}
