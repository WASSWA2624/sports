import { NextResponse } from "next/server";
import {
  buildDegradedSearchResult,
  normalizeSearchQuery,
  searchGlobal,
} from "../../../lib/coreui/search";
import { withDataAccessTimeout } from "../../../lib/data-access";
import { observeOperation, recordOperationalEvent } from "../../../lib/operations";

export async function GET(request) {
  const query = request.nextUrl.searchParams.get("q") || "";
  const locale = request.nextUrl.searchParams.get("locale") || "en";
  const requestedLimit = Number.parseInt(request.nextUrl.searchParams.get("limit") || "6", 10);
  const limitPerSection = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 3), 12)
    : 6;

  try {
    const results = await observeOperation(
      {
        category: "search_health",
        metric: "global_search",
        subject: locale,
        route: "/api/search",
        statusFromResult(result) {
          return result?.degraded ? "degraded" : "ok";
        },
        metadata(result) {
          return {
            queryLength: normalizeSearchQuery(query).length,
            limitPerSection,
            totalResults: result?.summary?.total || 0,
            degraded: Boolean(result?.degraded),
          };
        },
        eventOptions: {
          force: true,
        },
      },
      () =>
        withDataAccessTimeout(
          () =>
            searchGlobal(query, {
              locale,
              limitPerSection,
            }),
          { label: "Global search" }
        )
    );

    return NextResponse.json(results);
  } catch (error) {
    const fallback = buildDegradedSearchResult(normalizeSearchQuery(query));

    void recordOperationalEvent(
      {
        category: "search_health",
        metric: "global_search",
        subject: locale,
        route: "/api/search",
        status: "degraded",
        metadata: {
          queryLength: fallback.query.length,
          limitPerSection,
          totalResults: 0,
          degraded: true,
          error: error instanceof Error ? error.message : "Search failed.",
        },
      },
      {
        force: true,
      }
    );

    return NextResponse.json(fallback, {
      headers: {
        "x-search-mode": "degraded",
      },
    });
  }
}
