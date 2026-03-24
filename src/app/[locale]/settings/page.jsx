import { buildPageMetadata } from "../../../lib/coreui/metadata";
import { getDictionary } from "../../../lib/coreui/dictionaries";
import SettingsClient from "./settings-client";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const dictionary = getDictionary(locale);

  return buildPageMetadata(
    locale,
    dictionary.metaSettingsTitle,
    dictionary.metaSettingsDescription,
    "/settings"
  );
}

export default async function SettingsPage({ params }) {
  const { locale } = await params;
  const dictionary = getDictionary(locale);

  return <SettingsClient dictionary={dictionary} locale={locale} />;
}
