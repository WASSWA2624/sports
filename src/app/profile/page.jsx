import { getDictionary } from "../../lib/coreui/dictionaries";
import { getPreferredLocale } from "../../lib/coreui/preferences-server";
import ProfileClient from "./profile-client";

export default async function ProfilePage() {
  const locale = await getPreferredLocale().catch(() => "en");
  const dictionary = getDictionary(locale);

  return <ProfileClient dictionary={dictionary} locale={locale} />;
}
