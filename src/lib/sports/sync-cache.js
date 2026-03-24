import { COREUI_CACHE_TAGS, revalidateTagsWithAudit } from "../cache";

export function buildSportsSyncRevalidationTags({
  fixtures = [],
  fixtureRefs = [],
  leagueCodes = [],
} = {}) {
  const tags = new Set(COREUI_CACHE_TAGS);

  for (const fixture of fixtures || []) {
    if (fixture?.externalRef) {
      tags.add(`fixture:${fixture.externalRef}`);
    }

    if (fixture?.league?.code) {
      tags.add(`league:${fixture.league.code}`);
    }
  }

  for (const fixtureRef of fixtureRefs || []) {
    if (fixtureRef) {
      tags.add(`fixture:${fixtureRef}`);
    }
  }

  for (const leagueCode of leagueCodes || []) {
    if (leagueCode) {
      tags.add(`league:${leagueCode}`);
    }
  }

  return [...tags];
}

export async function revalidateSportsSyncTags(input, source = "sports-sync-write") {
  const tags = buildSportsSyncRevalidationTags(input);

  if (!tags.length) {
    return [];
  }

  try {
    await revalidateTagsWithAudit(tags, { source });
  } catch (error) {
    return tags;
  }

  return tags;
}
