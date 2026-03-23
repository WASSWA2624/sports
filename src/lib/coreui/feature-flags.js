import { unstable_cache } from "next/cache";
import { db } from "../db";

const DEFAULT_PUBLIC_SURFACE_FLAGS = {
  odds: true,
  broadcast: true,
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
    safely(async () => {
      const flags = await db.featureFlag.findMany({
        where: {
          key: {
            in: ["odds_surfaces_enabled", "broadcast_surfaces_enabled"],
          },
        },
        select: {
          key: true,
          enabled: true,
        },
      });

      const byKey = Object.fromEntries(flags.map((flag) => [flag.key, flag.enabled]));

      return {
        odds: byKey.odds_surfaces_enabled ?? DEFAULT_PUBLIC_SURFACE_FLAGS.odds,
        broadcast: byKey.broadcast_surfaces_enabled ?? DEFAULT_PUBLIC_SURFACE_FLAGS.broadcast,
      };
    }, DEFAULT_PUBLIC_SURFACE_FLAGS),
  ["coreui:public-surface-flags"],
  { revalidate: 300, tags: ["feature-flags"] }
);
