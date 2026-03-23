"use client";

import { useEffect } from "react";
import { trackPersonalizationEvent } from "../../lib/personalization-analytics";

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
  }, [active, metadata, surface]);

  return null;
}
