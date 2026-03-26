import { notFound, redirect } from "next/navigation";
import { isPrimarySportReference } from "../../../../lib/coreui/scope";

export default async function SportHubPage({ params }) {
  const { locale, sportSlug } = await params;

  if (!isPrimarySportReference(sportSlug)) {
    notFound();
  }

  redirect(`/${locale}`);
}
