import { NextResponse } from "next/server";
import { searchGlobal } from "../../../lib/coreui/search";

export async function GET(request) {
  const query = request.nextUrl.searchParams.get("q") || "";
  const locale = request.nextUrl.searchParams.get("locale") || "en";
  const requestedLimit = Number.parseInt(request.nextUrl.searchParams.get("limit") || "6", 10);
  const limitPerSection = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 3), 12)
    : 6;

  try {
    const results = await searchGlobal(query, {
      locale,
      limitPerSection,
    });

    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Search failed." },
      { status: 500 }
    );
  }
}
