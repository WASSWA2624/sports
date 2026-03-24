import { NextResponse } from "next/server";
import { getLeagueDetail } from "../../../../../lib/coreui/read";
import { resolveViewerTerritory } from "../../../../../lib/coreui/odds-broadcast";

export async function GET(request, { params }) {
  const { leagueCode } = await params;
  const { searchParams } = new URL(request.url);
  const locale = searchParams.get("locale") || "en";
  const viewerTerritory = resolveViewerTerritory({
    territory: searchParams.get("territory"),
    headers: request.headers,
  });
  const league = await getLeagueDetail(leagueCode, {
    locale,
    viewerTerritory,
  });

  if (!league) {
    return NextResponse.json({ error: "League not found" }, { status: 404 });
  }

  return NextResponse.json({
    league: {
      code: league.code,
      name: league.name,
      country: league.country,
    },
    competitionOdds: league.competitionOdds,
    bookmakers: league.competitionOdds.bookmakers || [],
    ctaConfig: league.competitionOdds.ctaConfig || null,
    insights: league.competitionOdds.insights || null,
    provider: league.competitionOdds.capability || null,
  });
}
