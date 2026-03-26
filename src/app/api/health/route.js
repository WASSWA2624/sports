import { NextResponse } from "next/server";
import { getReleaseInfo } from "../../../lib/release";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "sports",
    scope: "football-scores",
    timestamp: new Date().toISOString(),
    release: getReleaseInfo(),
  });
}
