import { getLeagueDirectory, getShellData } from "../lib/coreui/match-data";
import { SUPPORTED_LOCALES } from "../lib/coreui/preferences";
import { getSiteOrigin } from "../lib/coreui/site";

const STATIC_PUBLIC_PATHS = ["", "/live", "/fixtures", "/results", "/leagues"];

function createLocalizedEntries(path, lastModified = new Date()) {
  const origin = getSiteOrigin();

  return SUPPORTED_LOCALES.map((locale) => ({
    url: `${origin}/${locale}${path}`,
    lastModified,
  }));
}

export default async function sitemap() {
  const entries = STATIC_PUBLIC_PATHS.flatMap((path) => createLocalizedEntries(path));
  const generatedAt = new Date();
  const leagues = getLeagueDirectory();
  const fixtures = getShellData().fixtures;

  for (const league of leagues) {
    entries.push(...createLocalizedEntries(`/leagues/${league.code}`, generatedAt));
  }

  for (const fixture of fixtures) {
    entries.push(...createLocalizedEntries(`/match/${fixture.externalRef || fixture.id}`, generatedAt));
  }

  return entries;
}
