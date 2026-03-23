import { NextResponse } from "next/server";
import { recordRouteErrorEvent } from "../../../../lib/control-plane";

export async function POST(request) {
  try {
    const payload = await request.json();
    await recordRouteErrorEvent(payload);
    return NextResponse.json({ ok: true }, { status: 202 });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Invalid route error payload." },
      { status: 400 }
    );
  }
}
