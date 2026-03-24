import { NextResponse } from "next/server";
import { getAssetDeliverySnapshot } from "../../../lib/assets-server";
import { withDataAccessTimeout } from "../../../lib/data-access";
import { getOperationalDashboardSnapshot } from "../../../lib/operations";
import { getReleaseInfo } from "../../../lib/release";
import { getSportsSyncConfig } from "../../../lib/sports/config";
import { getProviderChain } from "../../../lib/sports/provider";

export async function GET() {
  try {
    const syncConfig = getSportsSyncConfig();
    const [operations, assets] = await withDataAccessTimeout(
      () =>
        Promise.all([
          getOperationalDashboardSnapshot(),
          getAssetDeliverySnapshot(),
        ]),
      { label: "Health snapshot" }
    );

    return NextResponse.json({
      status: "ok",
      service: "sports",
      timestamp: new Date().toISOString(),
      release: getReleaseInfo(),
      providerChain: getProviderChain(syncConfig.provider, syncConfig.fallbackProviders),
      liveData: operations.liveData,
      slos: operations.slos,
      cache: {
        hitRate: operations.cache.hitRate,
        observedTags: operations.cache.byTag.length,
      },
      search: operations.search,
      assets: {
        cdnConfigured: Boolean(assets.config.cdnBaseUrl),
        articleCoverage: assets.coverage.articles,
        competitionCoverage: assets.coverage.competitions,
        teamCoverage: assets.coverage.teams,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "degraded",
        service: "sports",
        timestamp: new Date().toISOString(),
        release: getReleaseInfo(),
        error: error instanceof Error ? error.message : "Health snapshot failed.",
      },
      { status: 503 }
    );
  }
}
