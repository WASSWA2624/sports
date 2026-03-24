import { fileURLToPath } from "node:url";
import { resolve, sep } from "node:path";
import { ensureDirectory, loadEnvFiles, pathExists } from "./lib/env-utils.mjs";
import {
  ROOT_DIR,
  buildReleaseDescriptor,
  copyPath,
  writeJsonFile,
} from "./lib/release-utils.mjs";

const OUTPUT_ROOT = resolve(ROOT_DIR, "build", "releases");

function shouldCopyBuildSource(sourcePath) {
  const normalized = sourcePath.split(/[\\/]+/).join(sep);
  return (
    !normalized.includes(`${sep}.next${sep}cache${sep}`) &&
    !normalized.endsWith(`${sep}.next${sep}cache`) &&
    !normalized.includes(`${sep}.next${sep}dev${sep}`) &&
    !normalized.endsWith(`${sep}.next${sep}dev`) &&
    !normalized.includes(`${sep}.next${sep}node_modules${sep}`) &&
    !normalized.endsWith(`${sep}.next${sep}node_modules`)
  );
}

async function copyIfPresent(sourcePath, destinationPath, options = {}) {
  if (!(await pathExists(sourcePath))) {
    return false;
  }

  await copyPath(sourcePath, destinationPath, options);
  return true;
}

export async function createReleaseArtifact() {
  await loadEnvFiles(ROOT_DIR);

  const descriptor = await buildReleaseDescriptor(ROOT_DIR);
  if (!descriptor.buildId) {
    throw new Error("No `.next/BUILD_ID` file was found. Run `npm run build` before creating a release artifact.");
  }

  const releaseDir = resolve(OUTPUT_ROOT, descriptor.version);
  if (await pathExists(releaseDir)) {
    throw new Error(`Release artifact directory already exists: ${releaseDir}`);
  }

  const appDir = resolve(releaseDir, "app");
  await ensureDirectory(appDir);

  const includedPaths = [];

  if (
    await copyIfPresent(resolve(ROOT_DIR, ".next"), resolve(appDir, ".next"), {
      filter: (sourcePath) => shouldCopyBuildSource(sourcePath),
    })
  ) {
    includedPaths.push(".next");
  }

  if (await copyIfPresent(resolve(ROOT_DIR, "public"), resolve(appDir, "public"))) {
    includedPaths.push("public");
  }

  for (const relativePath of [
    "package.json",
    "package-lock.json",
    "next.config.js",
    "README.md",
    "prisma/schema.prisma",
    "docs/production-release-runbook.md",
    "docs/production-release-2026-03-24.md",
    "docs/release-validation-2026-03-24.md",
  ]) {
    const copied = await copyIfPresent(resolve(ROOT_DIR, relativePath), resolve(appDir, relativePath));
    if (copied) {
      includedPaths.push(relativePath);
    }
  }

  if (
    await copyIfPresent(resolve(ROOT_DIR, "prisma", "migrations"), resolve(appDir, "prisma", "migrations"))
  ) {
    includedPaths.push("prisma/migrations");
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    release: descriptor,
    artifactRoot: releaseDir,
    applicationRoot: appDir,
    includedPaths,
    deployStrategy: {
      source: "versioned-build-bundle",
      promoteFrom: "staging",
      promoteTo: "production",
      startupCommand: "npm start",
    },
    operations: {
      preflightCommand: "RELEASE_PREFLIGHT_MODE=production npm run release:preflight",
      backupCommand: "npm run db:backup",
      migrationCommands: ["npm run db:migrate:status", "npm run db:migrate:deploy"],
      smokeCommand: "BASE_URL=https://sports.example npm run test:smoke",
    },
    rollback: {
      deployPreviousArtifact: true,
      restoreLatestBackup: true,
      revalidateCaches: true,
      rerunSmokeChecks: true,
    },
  };

  const manifestPath = resolve(releaseDir, "manifest.json");
  await writeJsonFile(manifestPath, manifest);

  return {
    releaseDir,
    manifestPath,
    release: descriptor,
    includedPaths,
  };
}

const isMainModule = fileURLToPath(import.meta.url) === resolve(process.argv[1] || "");

if (isMainModule) {
  try {
    const artifact = await createReleaseArtifact();
    console.log(JSON.stringify(artifact, null, 2));
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
