"use client";

import { startTransition, useEffect, useEffectEvent } from "react";
import { useRouter } from "next/navigation";

export function LiveRefresh({ enabled, intervalMs, until }) {
  const router = useRouter();

  const refreshRoute = useEffectEvent(() => {
    if (typeof document !== "undefined" && document.visibilityState !== "visible") {
      return;
    }

    startTransition(() => {
      router.refresh();
    });
  });

  useEffect(() => {
    if (!enabled || !intervalMs) {
      return undefined;
    }

    const deadline = until ? new Date(until).getTime() : Number.POSITIVE_INFINITY;

    const intervalId = window.setInterval(() => {
      if (Date.now() >= deadline) {
        window.clearInterval(intervalId);
        return;
      }

      refreshRoute();
    }, intervalMs);

    const onVisibilityChange = () => {
      if (Date.now() < deadline) {
        refreshRoute();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [enabled, intervalMs, until]);

  return null;
}
