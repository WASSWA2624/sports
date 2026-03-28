import { buildPageMetadata } from "../../lib/coreui/metadata";
import { getDictionary } from "../../lib/coreui/dictionaries";
import { getMatchdayFeedFromProvider } from "../../lib/coreui/sports-data";
import { Scoreboard } from "../../components/coreui/scoreboard";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const dictionary = getDictionary(locale);

  return buildPageMetadata(locale, dictionary.metaHomeTitle, dictionary.metaHomeDescription, "");
}

export default async function LocaleHomePage({ params, searchParams }) {
  const { locale } = await params;
  const filters = await searchParams;
  const feed = await getMatchdayFeedFromProvider({
    locale,
    date: filters?.date,
    preset: filters?.preset,
    startDate: filters?.startDate,
    startTime: filters?.startTime,
    endDate: filters?.endDate,
    endTime: filters?.endTime,
    status: filters?.status,
    query: filters?.q,
    leagueCode: filters?.league,
    time: filters?.time,
  });

  return (
    <Scoreboard locale={locale} feed={feed} />
  );
}
