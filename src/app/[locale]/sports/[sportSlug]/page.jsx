import { notFound, redirect } from "next/navigation";
import { buildMatchBoardHref } from "../../../../lib/coreui/minimal-routes";
import { isPrimarySportReference } from "../../../../lib/coreui/scope";

export default async function SportHubPage({ params, searchParams }) {
  const { locale, sportSlug } = await params;
  const filters = await searchParams;

  if (!isPrimarySportReference(sportSlug)) {
    notFound();
  }

  redirect(buildMatchBoardHref(locale, filters));
}
