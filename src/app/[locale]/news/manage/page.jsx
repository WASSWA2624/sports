import { redirect } from "next/navigation";
import { buildMatchBoardHref } from "../../../../lib/coreui/minimal-routes";

export default async function NewsManagePage({ params, searchParams }) {
  const { locale } = await params;
  const filters = await searchParams;
  redirect(buildMatchBoardHref(locale, filters));
}
