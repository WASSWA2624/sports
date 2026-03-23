import Link from "next/link";
import { getDictionary } from "../lib/coreui/dictionaries";
import { getPreferredLocale } from "../lib/coreui/preferences-server";

export default async function NotFound() {
  const locale = await getPreferredLocale().catch(() => "en");
  const dictionary = getDictionary(locale);

  return (
    <main className="app-empty">
      <h1>{dictionary.pageNotFound}</h1>
      <p>{dictionary.notFoundBody}</p>
      <Link href={`/${locale}`}>{dictionary.returnHome}</Link>
    </main>
  );
}
