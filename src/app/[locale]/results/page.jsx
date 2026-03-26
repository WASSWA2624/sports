import { redirect } from "next/navigation";

function buildRedirectHref(locale, filters, status) {
  const params = new URLSearchParams();

  params.set("status", status);

  if (filters?.date) {
    params.set("date", filters.date);
  }

  const query = params.toString();
  return `/${locale}${query ? `?${query}` : ""}`;
}

export default async function ResultsPage({ params, searchParams }) {
  const { locale } = await params;
  const filters = await searchParams;

  redirect(buildRedirectHref(locale, filters, "finished"));
}
