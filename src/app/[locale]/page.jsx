import { headers } from "next/headers";
import { buildPageMetadata } from "../../lib/coreui/metadata";
import { formatDictionaryText, getDictionary } from "../../lib/coreui/dictionaries";
import { getLiveMatchdayFeed } from "../../lib/coreui/live-read";
import { resolveViewerTerritory } from "../../lib/coreui/odds-broadcast";
import { Scoreboard } from "../../components/coreui/scoreboard";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const dictionary = getDictionary(locale);

  return buildPageMetadata(locale, dictionary.metaHomeTitle, dictionary.metaHomeDescription, "");
}

export default async function LocaleHomePage({ params, searchParams }) {
  const { locale } = await params;
  const filters = await searchParams;
  const dictionary = getDictionary(locale);
  const viewerTerritory = resolveViewerTerritory({
    headers: await headers(),
  });
  const feed = await getLiveMatchdayFeed({
    locale,
    status: filters?.status,
    date: filters?.date,
    viewerTerritory,
  });
  const lead = formatDictionaryText(dictionary.homeScoresLead, {
    live: feed.summary.LIVE,
    scheduled: feed.summary.SCHEDULED,
    finished: feed.summary.FINISHED,
  });

  return (
    <Scoreboard
      locale={locale}
      dictionary={dictionary}
      title={dictionary.homeScoresTitle || "Football live scores"}
      lead={lead}
      selectedStatus={feed.selectedStatus}
      feed={feed}
      emptyLabel="No football matches are available for this date or state."
    />
  );
}
