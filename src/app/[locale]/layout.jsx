import { notFound } from "next/navigation";
import { PublicShell } from "../../components/coreui/public-shell";
import { getDictionary } from "../../lib/coreui/dictionaries";
import {
  SUPPORTED_LOCALES,
  normalizeLocale,
} from "../../lib/coreui/preferences";
import { getPreferenceSnapshot } from "../../lib/coreui/preferences-server";

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

  return (
    <PublicShell
      locale={locale}
      dictionary={dictionary}
      initialTheme={preferences.theme}
      initialWatchlist={preferences.watchlist}
    >
      {children}
    </PublicShell>
  );
}
