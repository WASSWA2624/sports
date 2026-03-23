export function trackProductAnalyticsEvent(payload) {
  if (typeof window === "undefined" || !payload?.event || !payload?.surface) {
    return;
  }

  window.dispatchEvent(
    new CustomEvent("sports:product-analytics", {
      detail: payload,
    })
  );

  if (Array.isArray(window.dataLayer)) {
    window.dataLayer.push({
      event: "sports_product_analytics",
      ...payload,
    });
  }

  const body = JSON.stringify(payload);

  if (navigator.sendBeacon) {
    navigator.sendBeacon(
      "/api/analytics/product",
      new Blob([body], { type: "application/json" })
    );
    return;
  }

  fetch("/api/analytics/product", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body,
    keepalive: true,
  }).catch(() => {});
}
