"use client";

import { usePathname } from "next/navigation";
import { RouteError } from "../../../components/coreui/route-error";
import { getDictionary } from "../../../lib/coreui/dictionaries";

export default function Error({ reset }) {
  const pathname = usePathname();
  const locale = pathname?.split("/").filter(Boolean)[0] || "en";
  const dictionary = getDictionary(locale);

  return (
    <RouteError
      boundary="results-page"
      eyebrow={dictionary.routeError}
      title={dictionary.resultsPageUnavailable}
      body={dictionary.resultsPageUnavailableBody}
      resetLabel={dictionary.retry}
      reset={reset}
    />
  );
}
