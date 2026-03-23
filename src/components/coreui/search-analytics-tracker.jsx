"use client";

import { useEffect } from "react";
import { trackProductAnalyticsEvent } from "../../lib/product-analytics";

export function SearchAnalyticsTracker({ query, total, counts, surface = "search-page" }) {
  useEffect(() => {
    if (!query) {
      return;
    }

    trackProductAnalyticsEvent({
      event: "search_query",
      surface,
      query,
      metadata: {
        total,
        counts,
      },
    });

    if (!total) {
      trackProductAnalyticsEvent({
        event: "search_zero_results",
        surface,
        query,
      });
    }
  }, [counts, query, surface, total]);

  return null;
}
