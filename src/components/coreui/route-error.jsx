"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import styles from "./styles.module.css";

export function RouteError({ title, body, eyebrow, resetLabel, reset, boundary = "route-error" }) {
  const pathname = usePathname();
  const hasReportedRef = useRef(false);

  useEffect(() => {
    if (!pathname || hasReportedRef.current) {
      return;
    }

    hasReportedRef.current = true;
    const payload = JSON.stringify({
      route: pathname,
      boundary,
      message: title,
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
  }, [boundary, pathname, title]);

  return (
    <section className={styles.section}>
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h1 className={styles.pageTitle}>{title}</h1>
        </div>
      </div>

      <div className={styles.emptyState}>
        <p>{body}</p>
        <button type="button" className={styles.actionButton} onClick={() => reset()}>
          {resetLabel}
        </button>
      </div>
    </section>
  );
}
