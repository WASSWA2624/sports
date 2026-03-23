export function trackPersonalizationEvent(payload) {
  if (typeof window === "undefined" || !payload?.event || !payload?.surface) {
    return;
  }

  window.dispatchEvent(
    new CustomEvent("sports:personalization", {
      detail: payload,
    })
  );

  if (Array.isArray(window.dataLayer)) {
    window.dataLayer.push({
      event: "sports_personalization",
      ...payload,
    });
  }

  const body = JSON.stringify(payload);

  if (navigator.sendBeacon) {
    navigator.sendBeacon(
      "/api/analytics/personalization",
      new Blob([body], { type: "application/json" })
    );
    return;
  }

  fetch("/api/analytics/personalization", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body,
    keepalive: true,
  }).catch(() => {});
}
