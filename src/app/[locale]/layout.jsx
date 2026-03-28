import { notFound } from "next/navigation";
import { PublicShell } from "../../components/coreui/public-shell";
import { getDictionary } from "../../lib/coreui/dictionaries";
import { getShellDataFromProvider } from "../../lib/coreui/sports-data";
import { SUPPORTED_LOCALES, normalizeLocale } from "../../lib/coreui/preferences";

export function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }) {
  const { locale: rawLocale } = await params;
  const locale = normalizeLocale(rawLocale);

  if (rawLocale !== locale) {
    notFound();
  }

  const shellData = await getShellDataFromProvider();

  return (
    <PublicShell locale={locale} dictionary={getDictionary(locale)} shellData={shellData}>
      {children}
    </PublicShell>
  );
}
