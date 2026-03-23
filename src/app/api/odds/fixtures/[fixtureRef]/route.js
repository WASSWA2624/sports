import { NextResponse } from "next/server";
import { getFixtureDetail } from "../../../../../lib/coreui/read";
import { resolveViewerTerritory } from "../../../../../lib/coreui/odds-broadcast";

export async function GET(request, { params }) {
  const { fixtureRef } = await params;
  const { searchParams } = new URL(request.url);
  const locale = searchParams.get("locale") || "en";
  const viewerTerritory = resolveViewerTerritory({
    territory: searchParams.get("territory"),
    headers: request.headers,
  });
  const fixture = await getFixtureDetail(fixtureRef, {
    locale,
    viewerTerritory,
  });

  if (!fixture) {
    return NextResponse.json({ error: "Fixture not found" }, { status: 404 });
  }

  return NextResponse.json({
    fixtureRef: fixture.externalRef || fixture.id,
    league: {
      code: fixture.league.code,
      name: fixture.league.name,
    },
    fixture: {
      id: fixture.id,
      homeTeam: fixture.homeTeam.name,
      awayTeam: fixture.awayTeam.name,
      startsAt: fixture.startsAt,
      status: fixture.status,
    },
    odds: fixture.odds,
  });
}
