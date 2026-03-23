"use client";

import { useEffect } from "react";
import { usePreferences } from "./preferences-provider";

export function RecentViewTracker({ itemId, label, metadata }) {
  const { recordView } = usePreferences();

  useEffect(() => {
    recordView(itemId, { label, metadata });
  }, [itemId, label, metadata, recordView]);

  return null;
}
