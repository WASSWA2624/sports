import { unstable_cache } from "next/cache";
import { getPublicControlState } from "../control-plane";
import { safeDataRead } from "../data-access";

const DEFAULT_PUBLIC_SURFACE_FLAGS = {
  news: false,
  homeNews: false,
  leagueNews: false,
  teamNews: false,
  liveNews: false,
  resultsNews: false,
  odds: false,
  predictions: false,
  fixtureOdds: false,
  competitionOdds: false,
  broadcast: false,
  fixtureBroadcast: false,
  shellAdSlot: false,
  shellConsent: false,
  shellSupport: false,
  shellFunnelEntry: false,
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
