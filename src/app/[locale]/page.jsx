import { buildPageMetadata } from "../../lib/coreui/metadata";
import { getDictionary } from "../../lib/coreui/dictionaries";
import { getMatchdayFeed } from "../../lib/coreui/match-data";
import { Scoreboard } from "../../components/coreui/scoreboard";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const dictionary = getDictionary(locale);

  return buildPageMetadata(locale, dictionary.metaHomeTitle, dictionary.metaHomeDescription, "");
}

export default async function LocaleHomePage({ params, searchParams }) {
  const { locale } = await params;
  const filters = await searchParams;
  const feed = getMatchdayFeed({
    date: filters?.date,
    status: filters?.status,
    query: filters?.q,
    leagueCode: filters?.league,
    time: filters?.time,
  });

  return (
    <Scoreboard
      locale={locale}
      title="Football match board"
      lead="Track live scores, upcoming fixtures, and recent results. Search by league, team, or kickoff time."
      feed={feed}
    />
  );
}
