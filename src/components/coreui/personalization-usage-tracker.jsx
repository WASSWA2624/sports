"use client";

import { useEffect } from "react";
import { trackPersonalizationEvent } from "../../lib/personalization-analytics";
import { trackProductAnalyticsEvent } from "../../lib/product-analytics";

export function PersonalizationUsageTracker({ active, surface, metadata = null }) {
  useEffect(() => {
    if (!active) {
      return;
    }

    trackPersonalizationEvent({
      event: "favorites_return_usage",
      surface,
      metadata,
    });

    trackProductAnalyticsEvent({
      event: "return_session",
      surface,
      metadata,
    });
  }, [active, metadata, surface]);

  return null;
}
