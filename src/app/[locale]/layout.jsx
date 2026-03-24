import { notFound } from "next/navigation";
import { PublicShell } from "../../components/coreui/public-shell";
import { getDictionary } from "../../lib/coreui/dictionaries";
import {
  SUPPORTED_LOCALES,
  normalizeLocale,
} from "../../lib/coreui/preferences";
import { getPreferenceSnapshot } from "../../lib/coreui/preferences-server";
import { getShellSnapshot } from "../../lib/coreui/read";
import { getViewerGeo } from "../../lib/platform/request-context";

export function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }) {
  const { locale: rawLocale } = await params;
  const locale = normalizeLocale(rawLocale);

  if (rawLocale !== locale) {
    notFound();
  }

  const preferences = await getPreferenceSnapshot();
  const dictionary = getDictionary(locale);
  const [shellData, viewerGeo] = await Promise.all([
    getShellSnapshot(locale),
    getViewerGeo(),
  ]);

  return (
    <PublicShell
      locale={locale}
      viewerGeo={viewerGeo}
      dictionary={dictionary}
      initialTheme={preferences.theme}
      initialWatchlist={preferences.watchlist}
      initialAlertSettings={preferences.alertSettings}
      initialRecentViews={preferences.recentViews}
      initialFavoriteSports={preferences.favoriteSports}
      shellData={shellData}
    >
      {children}
    </PublicShell>
  );
}
