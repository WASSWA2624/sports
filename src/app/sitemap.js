import { db } from "../lib/db";
import { safeDataRead } from "../lib/data-access";
import { SUPPORTED_LOCALES } from "../lib/coreui/preferences";
import { getSiteOrigin } from "../lib/coreui/site";

const STATIC_PUBLIC_PATHS = ["", "/live", "/fixtures", "/results", "/tables", "/leagues", "/teams", "/news"];

function createLocalizedEntries(path, lastModified = new Date()) {
  const origin = getSiteOrigin();

  return SUPPORTED_LOCALES.map((locale) => ({
    url: `${origin}/${locale}${path}`,
    lastModified,
  }));
}

export default async function sitemap() {
  const entries = STATIC_PUBLIC_PATHS.flatMap((path) => createLocalizedEntries(path));
  const [sports, leagues, teams, fixtures, articles] = await safeDataRead(
    () =>
      Promise.all([
        db.sport.findMany({
          where: { isEnabled: true },
          select: { slug: true, updatedAt: true },
        }),
        db.league.findMany({
          where: { isActive: true },
          select: {
            code: true,
            updatedAt: true,
            sport: {
              select: {
                slug: true,
              },
            },
            countryRecord: {
              select: {
                slug: true,
              },
            },
          },
        }),
        db.team.findMany({
          select: { id: true, updatedAt: true },
        }),
        db.fixture.findMany({
          select: { externalRef: true, id: true, updatedAt: true },
        }),
        db.newsArticle.findMany({
          where: {
            status: "PUBLISHED",
            OR: [{ publishedAt: null }, { publishedAt: { lte: new Date() } }],
          },
          select: { slug: true, updatedAt: true },
        }),
      ]),
    [[], [], [], [], []],
    { label: "Sitemap generation" }
  );

  for (const sport of sports) {
    entries.push(...createLocalizedEntries(`/sports/${sport.slug}`, sport.updatedAt));
  }

  for (const league of leagues) {
    entries.push(...createLocalizedEntries(`/leagues/${league.code}`, league.updatedAt));

    if (league.sport?.slug && league.countryRecord?.slug) {
      entries.push(
        ...createLocalizedEntries(
          `/sports/${league.sport.slug}/countries/${league.countryRecord.slug}`,
          league.updatedAt
        )
      );
    }
  }

  for (const team of teams) {
    entries.push(...createLocalizedEntries(`/teams/${team.id}`, team.updatedAt));
  }

  for (const fixture of fixtures) {
    entries.push(...createLocalizedEntries(`/match/${fixture.externalRef || fixture.id}`, fixture.updatedAt));
  }

  for (const article of articles) {
    entries.push(...createLocalizedEntries(`/news/${article.slug}`, article.updatedAt));
  }

  return entries;
}
