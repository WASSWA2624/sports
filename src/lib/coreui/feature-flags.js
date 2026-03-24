import { unstable_cache } from "next/cache";
import { getPublicControlState } from "../control-plane";
import { safeDataRead } from "../data-access";

const DEFAULT_PUBLIC_SURFACE_FLAGS = {
  news: true,
  homeNews: true,
  leagueNews: true,
  teamNews: true,
  liveNews: true,
  resultsNews: true,
  odds: true,
  predictions: true,
  fixtureOdds: true,
  competitionOdds: true,
  broadcast: true,
  fixtureBroadcast: true,
  shellAdSlot: true,
  shellConsent: true,
  shellSupport: true,
  shellFunnelEntry: true,
  moduleMap: {},
};

export const getPublicSurfaceFlags = unstable_cache(
  async () =>
    safeDataRead(() => getPublicControlState(), DEFAULT_PUBLIC_SURFACE_FLAGS, {
      label: "Public surface flags",
    }),
  ["coreui:public-surface-flags"],
  { revalidate: 300, tags: ["feature-flags", "coreui:shell"] }
);
