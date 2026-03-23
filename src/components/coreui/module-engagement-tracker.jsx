"use client";

import { useEffect, useEffectEvent, useRef } from "react";

function pushAnalyticsEvent(payload) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent("sports:module-engagement", {
      detail: payload,
    })
  );

  if (Array.isArray(window.dataLayer)) {
    window.dataLayer.push({
      event: "sports_module_engagement",
      ...payload,
    });
  }

  const body = JSON.stringify(payload);
  if (navigator.sendBeacon) {
    navigator.sendBeacon(
      "/api/analytics/module-engagement",
      new Blob([body], { type: "application/json" })
    );
    return;
  }

  fetch("/api/analytics/module-engagement", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body,
    keepalive: true,
  }).catch(() => {});
}

export function ModuleEngagementTracker({
  moduleType,
  entityType,
  entityId,
  surface,
  metadata = null,
  children,
}) {
  const hasViewedRef = useRef(false);
  const hasInteractedRef = useRef(false);

  const payloadBase = {
    moduleType,
    entityType,
    entityId,
    surface,
    metadata,
  };

  useEffect(() => {
    if (hasViewedRef.current) {
      return;
    }

    hasViewedRef.current = true;
    pushAnalyticsEvent({
      ...payloadBase,
      event: "view",
    });
  }, [entityId, entityType, moduleType, surface]);

  const handleInteraction = useEffectEvent((event) => {
    if (hasInteractedRef.current) {
      return;
    }

    if (!(event.target instanceof Element)) {
      return;
    }

    const actionableTarget = event.target.closest("a, button, [data-analytics-action]");
    if (!actionableTarget) {
      return;
    }

    hasInteractedRef.current = true;
    pushAnalyticsEvent({
      ...payloadBase,
      event: "interact",
      action:
        actionableTarget.getAttribute("data-analytics-action") ||
        actionableTarget.textContent?.trim()?.slice(0, 80) ||
        "interact",
    });
  });

  return <div onClickCapture={handleInteraction}>{children}</div>;
}
