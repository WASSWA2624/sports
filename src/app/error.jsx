"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { getDictionary } from "../lib/coreui/dictionaries";

export default function AppError({ reset }) {
  const pathname = usePathname();
  const locale = pathname?.split("/").filter(Boolean)[0] || "en";
  const dictionary = getDictionary(locale);
  const hasReportedRef = useRef(false);

  useEffect(() => {
    if (!pathname || hasReportedRef.current) {
      return;
    }

    hasReportedRef.current = true;
    const payload = JSON.stringify({
      route: pathname,
      boundary: "global-page",
      message: dictionary.globalErrorTitle,
    });

    if (navigator.sendBeacon) {
      navigator.sendBeacon(
        "/api/telemetry/route-errors",
        new Blob([payload], { type: "application/json" })
      );
      return;
    }

    fetch("/api/telemetry/route-errors", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  }, [dictionary.globalErrorTitle, pathname]);

  return (
    <main className="app-error">
      <h1>{dictionary.globalErrorTitle}</h1>
      <p>{dictionary.globalErrorBody}</p>
      <button type="button" onClick={() => reset()}>
        {dictionary.retry}
      </button>
    </main>
  );
}
