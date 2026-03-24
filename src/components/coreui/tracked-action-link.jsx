"use client";

import Link from "next/link";
import { trackProductAnalyticsEvent } from "../../lib/product-analytics";

function sendReliableJson(url, payload) {
  if (typeof window === "undefined" || !payload) {
    return;
  }

  const body = JSON.stringify(payload);

  if (navigator.sendBeacon) {
    navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
    return;
  }

  fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body,
    keepalive: true,
  }).catch(() => {});
}

export function TrackedActionLink({
  href,
  className,
  children,
  external = false,
  analyticsEvent = null,
  analyticsSurface = null,
  analyticsEntityType = null,
  analyticsEntityId = null,
  analyticsAction = null,
  analyticsMetadata = null,
  affiliateClick = null,
  dataAnalyticsAction = null,
  target,
  rel,
}) {
  if (!href || !children) {
    return null;
  }

  function handleClick() {
    if (analyticsEvent && analyticsSurface) {
      trackProductAnalyticsEvent({
        event: analyticsEvent,
        surface: analyticsSurface,
        entityType: analyticsEntityType || undefined,
        entityId: analyticsEntityId || undefined,
        action: analyticsAction || undefined,
        metadata: analyticsMetadata || undefined,
      });
    }

    if (affiliateClick?.affiliateLinkId || affiliateClick?.bookmakerId) {
      sendReliableJson("/api/analytics/affiliate-click", {
        ...affiliateClick,
        targetUrl: href,
        referrerUrl: typeof window !== "undefined" ? window.location.href : null,
      });
    }
  }

  const sharedProps = {
    className,
    onClick: handleClick,
    "data-analytics-action": dataAnalyticsAction || analyticsAction || undefined,
  };

  if (external) {
    return (
      <a
        href={href}
        target={target || "_blank"}
        rel={rel || "noreferrer"}
        {...sharedProps}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} {...sharedProps}>
      {children}
    </Link>
  );
}
