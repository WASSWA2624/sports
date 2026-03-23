"use client";

import { useEffect, useRef } from "react";
import { trackProductAnalyticsEvent } from "../../lib/product-analytics";

export function NewsEngagementTracker({
  surface,
  articleIds = [],
  articleId = null,
  children,
}) {
  const hasTrackedViewRef = useRef(false);

  useEffect(() => {
    if (hasTrackedViewRef.current) {
      return;
    }

    hasTrackedViewRef.current = true;

    if (articleId) {
      trackProductAnalyticsEvent({
        event: "news_article_view",
        surface,
        entityType: "article",
        entityId: articleId,
        metadata: {
          relatedCount: articleIds.length,
        },
      });
      return;
    }

    trackProductAnalyticsEvent({
      event: "news_module_view",
      surface,
      metadata: {
        articleIds,
        count: articleIds.length,
      },
    });
  }, [articleId, articleIds, surface]);

  function handleClick(event) {
    if (!(event.target instanceof Element)) {
      return;
    }

    const articleTarget = event.target.closest("[data-news-article-id]");
    if (!articleTarget) {
      return;
    }

    trackProductAnalyticsEvent({
      event: "news_article_click",
      surface,
      entityType: "article",
      entityId: articleTarget.getAttribute("data-news-article-id") || undefined,
      action: articleTarget.getAttribute("href") || undefined,
    });
  }

  return <div onClickCapture={handleClick}>{children}</div>;
}
