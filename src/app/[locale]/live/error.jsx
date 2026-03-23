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
      eyebrow={dictionary.routeError}
      title={dictionary.livePageUnavailable}
      body={dictionary.livePageUnavailableBody}
      resetLabel={dictionary.retry}
      reset={reset}
    />
  );
}
