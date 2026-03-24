import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
import { loadEnvFiles, pathExists } from "./lib/env-utils.mjs";
import { ROOT_DIR, readBuildId } from "./lib/release-utils.mjs";
import { runReleasePreflight } from "./release-preflight.mjs";
import { createReleaseArtifact } from "./build-release-artifact.mjs";

function getNpmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

async function runBuildIfNeeded() {
  const buildId = await readBuildId(ROOT_DIR);
  if (buildId) {
    return {
      built: false,
      buildId,
    };
  }

  const npmCommand = getNpmCommand();

  await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(npmCommand, ["run", "build"], {
      cwd: ROOT_DIR,
      env: process.env,
      stdio: "inherit",
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolvePromise();
        return;
      }

      rejectPromise(new Error("`npm run build` failed while preparing the production release."));
    });
  });

  const nextBuildId = await readBuildId(ROOT_DIR);
  if (!nextBuildId) {
    throw new Error("Build completed but `.next/BUILD_ID` is still missing.");
  }

  return {
    built: true,
    buildId: nextBuildId,
  };
}

export async function runProductionRelease() {
  await loadEnvFiles(ROOT_DIR);

  if (!(await pathExists(resolve(ROOT_DIR, "node_modules")))) {
    throw new Error("Dependencies are missing. Run `npm ci` before preparing a production release.");
  }

  const build = await runBuildIfNeeded();
  const preflight = await runReleasePreflight({
    mode:
      process.env.RELEASE_PREFLIGHT_MODE ||
      (process.env.NODE_ENV === "production" ? "production" : "staging"),
  });

  if (preflight.summary.fail > 0) {
    return {
      build,
      preflight,
      artifact: null,
      nextSteps: [
        "Resolve the failing preflight checks.",
        "Re-run `npm run release:production`.",
      ],
    };
  }

  const artifact = await createReleaseArtifact();

  return {
    build,
    preflight,
    artifact,
    nextSteps: [
      "Run `npm run db:backup` before applying production migrations.",
      "Run `npm run db:migrate:deploy` in the production environment.",
      "Run `BASE_URL=https://sports.example npm run test:smoke` against the promoted release.",
      "Monitor `/api/health` and the admin control room during the first-hour watch window.",
    ],
  };
}

const isMainModule = fileURLToPath(import.meta.url) === resolve(process.argv[1] || "");

if (isMainModule) {
  try {
    const summary = await runProductionRelease();
    console.log(JSON.stringify(summary, null, 2));

    if (summary.preflight?.summary?.fail > 0) {
      process.exitCode = 1;
    }
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
