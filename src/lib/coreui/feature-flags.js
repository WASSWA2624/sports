import { unstable_cache } from "next/cache";
import { getPublicControlState } from "../control-plane";

const DEFAULT_PUBLIC_SURFACE_FLAGS = {
  news: true,
  homeNews: true,
  leagueNews: true,
  teamNews: true,
  liveNews: true,
  resultsNews: true,
  odds: true,
  fixtureOdds: true,
  competitionOdds: true,
  broadcast: true,
  fixtureBroadcast: true,
  shellAdSlot: true,
  shellConsent: true,
  shellSupport: true,
  moduleMap: {},
};

async function safely(query, fallback) {
  try {
    return await query();
  } catch (error) {
    return fallback;
  }
}

export const getPublicSurfaceFlags = unstable_cache(
  async () =>
    safely(() => getPublicControlState(), DEFAULT_PUBLIC_SURFACE_FLAGS),
  ["coreui:public-surface-flags"],
  { revalidate: 300, tags: ["feature-flags", "coreui:shell"] }
);
